<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { parse, stringify } from 'yaml';

// Define the Repository interface
interface Repository {
  id: number
  name: string
  description?: string
}

// List of GitLab IDs to filter
// const allowedProjectIds = [];

// Repositories state
const repositories = ref<Repository[]>([]);
let selectedRepositoryId: number | null = null;
let selectedRepository: Repository | null = null;
const isLocked = ref(false); // Lock flag to control selection

const accessToken = localStorage.getItem('access_token');
const GITLAB_HOST_URL = 'https://gitlab.ca/';

// User info state
const userName = ref<string | null>(null);
const userAvatar = ref<string | null>(null);

// Form state
const contact = ref({ name: '', email: '' });
const businessPartnerContact = ref({ name: '', email: '' });
const businessPartnerDivisionFrc = ref('');
const dpmoJiraKey = ref('');
const peCode = ref('');
const wid = ref('');
const fiscal = ref<number[]>([]);
const gates = ref({
  accessibility: { status: '', date: '' },
  authorityToOperate: { status: '', date: '' },
});

// Submission feedback state
const submissionStatus = ref<string | null>(null);
const fileExistsStatus = ref<string | null>(null);
const currentFileName = ref<string | null>(null);

// Fetch the user's access level for the selected repository
async function fetchUserAccessLevel(repositoryId: number): Promise<number | null> {
  try {
    console.log('Fetching user access level for repository:', repositoryId);

    const response = await axios.get(`${GITLAB_HOST_URL}/api/v4/projects/${repositoryId}/members`, { // project repo
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Response from GitLab members API:', response.data);

    const userData = response.data.find((user: any) => user.username === userName.value);

    if (userData) {
      console.log(`User ${userName.value} found with access level:`, userData.access_level);
      return userData.access_level; // Log access level here
    }
    else {
      console.log(`User ${userName.value} not found in the repository members.`);
      return null;
    }
  }
  catch (error: any) {
    console.error('Error fetching user access level:', error.response?.data || error.message);
    return null;
  }
}

// Fetch user information from GitLab
async function fetchUserInfo() {
  if (!accessToken) {
    console.error('No access token found. Please log in again.');
    return;
  }

  try {
    console.log('Fetching user information with access token:', accessToken);

    const response = await axios.get(`${GITLAB_HOST_URL}/api/v4/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = response.data;
    userName.value = userData.username; // Ensure we are using the username (not the display name)
    userAvatar.value = userData.avatar_url;

    console.log('User information fetched successfully:', userData);
  }
  catch (error: any) {
    console.error('Error fetching user information:', error.response?.data || error.message);
  }
}

// Fetch repositories from GitLab that the user has access to
async function fetchRepositories() {
  if (!accessToken) {
    console.error('No access token found. Please log in again.');
    return;
  }

  try {
    console.log('Fetching repositories with access token:', accessToken);

    const response = await axios.get<Repository[]>(`${GITLAB_HOST_URL}/api/v4/projects?membership=true&order_by=created_at&page=1&per_page=40`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Filter repositories to only include those in the allowedProjectIds list
    repositories.value = response.data
      .map(repo => ({ ...repo }))
      .filter(repo => allowedProjectIds.includes(repo.id));

    console.log('Filtered repositories:', repositories.value);

    // Pre-select the first repository if available
    if (repositories.value.length > 0) {
      selectedRepositoryId = repositories.value[0].id;
      selectedRepository = repositories.value[0];
      console.log('Initially selectedRepository:', selectedRepository);
    }
  }
  catch (error) {
    console.error('Error fetching repositories:', error);
  }
}

// Handle repository selection
function handleRepositorySelection(event: Event) {
  const target = event.target as HTMLSelectElement;
  const newId = Number(target.value);

  if (!Number.isNaN(newId)) {
    selectedRepositoryId = newId;
    selectedRepository = repositories.value.find(repo => repo.id === newId) || null;
    console.log('Repository selected:', selectedRepository);
  }
  else {
    console.error('Invalid repository selection.');
  }
}

// Lock the selected repository to prevent changes and fetch access level
async function lockSelection() {
  if (selectedRepository) {
    isLocked.value = true;
    console.log('Repository selection locked:', selectedRepository);

    // Verify that userName is correctly set
    console.log('Current user:', userName.value);

    await checkForYamlFiles(); // Check for existing YAML files

    // Fetch the user's access level for the selected repository
    const userAccessLevel = await fetchUserAccessLevel(selectedRepository.id);

    // Check access level and log appropriately
    if (userAccessLevel === 50 || userAccessLevel === 40) {
      console.log('User is Owner or Maintainer');
      // Proceed with the file editing logic
      await checkForYamlFiles(); // Check for existing YAML files
    }
    else if (userAccessLevel === 30) {
      console.log('User is Developer');
      submissionStatus.value = 'You have a Developer role. You will submit your changes via merge request.';
    }
    else if (userAccessLevel === 20) {
      console.log('User is Reporter');
      submissionStatus.value = 'You have a Reporter role. You can view the data but cannot edit the file.';
    }
    else if (userAccessLevel === null) {
      console.log('Unable to determine user access level.');
      submissionStatus.value = 'Unable to determine your permissions. Please try again or contact support.';
    }
    else {
      console.log('User is Guest or not a member');
      submissionStatus.value = 'You have a Guest role. You can view the data but cannot edit the file.';
    }
  }
  else {
    console.error('No repository selected to lock.');
  }
}

// Check if form_data.yaml exists
async function checkForYamlFiles() {
  const baseFileName = 'form_data.yaml';
  currentFileName.value = baseFileName;

  try {
    const exists = await fileExists(baseFileName);
    if (exists) {
      fileExistsStatus.value = `File ${baseFileName} found. Loading data...`;
      await loadYamlData(baseFileName);
    }
    else {
      fileExistsStatus.value = 'No form_data.yaml file found.';
    }
  }
  catch (error: any) {
    console.error('Error checking for YAML files:', error.response?.data || error.message);
    fileExistsStatus.value = 'Error checking for YAML files.';
  }
}

// Check if a file exists in the repository
async function fileExists(filePath: string) {
  try {
    await axios.get(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/repository/files/${encodeURIComponent(filePath)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        ref: 'main',
      },
    });
    return true;
  }
  catch (error: any) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

// Load YAML data into the form
async function loadYamlData(fileName: string) {
  // Simulate the user being a developer for testing
  const userAccessLevel = await fetchUserAccessLevel(selectedRepositoryId!);

  // Access level thresholds
  // const OWNER_ACCESS_LEVEL = 50;
  // const MAINTAINER_ACCESS_LEVEL = 40;
  // const DEVELOPER_ACCESS_LEVEL = 30;
  // const REPORTER_ACCESS_LEVEL = 20;

  console.log('User access level:', userAccessLevel);

  try {
    // Directly attempt to load the YAML data regardless of access level
    console.log(`Attempting to load file: ${fileName} for repository ID: ${selectedRepository?.id}`);

    const response = await axios.get(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/repository/files/${encodeURIComponent(fileName)}/raw`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        ref: 'main',
      },
    });

    const yamlData = parse(response.data);

    // Fill form with the loaded data
    contact.value = yamlData.contact || { name: '', email: '' };
    businessPartnerContact.value = yamlData.businessPartnerContact || { name: '', email: '' };
    businessPartnerDivisionFrc.value = yamlData.businessPartnerDivisionFrc || '';
    dpmoJiraKey.value = yamlData.dpmoJiraKey || '';
    peCode.value = yamlData.peCode || '';
    wid.value = yamlData.wid || '';
    fiscal.value = yamlData.fiscal || [];
    gates.value = yamlData.gates || {
      accessibility: { status: '', date: '' },
      authorityToOperate: { status: '', date: '' },
    };

    console.log('Loaded YAML data into form:', yamlData);

    submissionStatus.value = 'File loaded successfully!';
  }
  catch (error: any) {
    console.error('Error loading YAML data:', error.response?.data || error.message);

    if (error.response?.status === 403) {
      submissionStatus.value = 'You do not have permission to view this file.';
    }
    else if (error.response?.status === 404) {
      submissionStatus.value = 'The requested file was not found.';
    }
    else {
      submissionStatus.value = 'An error occurred while loading the file.';
    }
  }
}

// Save or update YAML file in the selected repository
async function saveYamlToRepository(yamlData: string) {
  if (!selectedRepository) {
    console.error('No repository selected.');
    submissionStatus.value = 'No repository selected.';
    return;
  }

  const fileName = currentFileName.value || 'form_data.yaml'; // Ensure fileName is always set
  const branchName = 'main';

  try {
    // Check if the file already exists
    const exists = await fileExists(fileName);

    if (exists) {
      // Update the existing file
      const response = await axios.put(
        `${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository.id}/repository/files/${encodeURIComponent(fileName)}`,
        {
          branch: branchName,
          content: yamlData, // Send plain YAML content
          commit_message: `Update ${fileName} with new data`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('YAML file updated:', response.data);
      submissionStatus.value = `YAML file updated successfully: ${fileName}`;
    }
    else {
      // Create a new file
      const response = await axios.post(
        `${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository.id}/repository/files/${encodeURIComponent(fileName)}`,
        {
          branch: branchName,
          content: yamlData, // Send plain YAML content
          commit_message: `Create ${fileName} with new data`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('YAML file created:', response.data);
      submissionStatus.value = `YAML file created successfully: ${fileName}`;
    }
  }
  catch (error: any) {
    console.error('Error saving YAML file:', error.response?.data || error.message);
    submissionStatus.value = `Error saving YAML file: ${error.response?.data?.message || error.message}`;
  }
}

// Create a merge request with the YAML changes (for developers)
async function createMergeRequest(yamlData: string) {
  const branchName = `dev-changes-${Date.now()}`; // Generate a unique branch name
  const commitMessage = 'Developer changes to form_data.yaml';

  try {
    // Step 1: Create a new branch
    await axios.post(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/repository/branches`, {
      branch: branchName,
      ref: 'main', // Create the new branch from 'main'
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(`Branch ${branchName} created.`);

    // Step 2: Check if the file exists in the repository
    let fileExists = false;
    try {
      await axios.get(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/repository/files/${encodeURIComponent('form_data.yaml')}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          ref: branchName, // Check in the new branch
        },
      });
      fileExists = true;
    }
    catch (error: any) {
      if (error.response?.status === 404) {
        fileExists = false; // File does not exist
      }
      else {
        throw error; // If other error, throw it
      }
    }

    // Step 3: Commit changes to the new branch
    const commitPayload = {
      branch: branchName,
      content: yamlData,
      commit_message: commitMessage,
    };

    if (fileExists) {
      // Update the existing file
      await axios.put(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/repository/files/form_data.yaml`, commitPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log('File updated in branch:', branchName);
    }
    else {
      // Create a new file
      await axios.post(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/repository/files/form_data.yaml`, commitPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log('New file created in branch:', branchName);
    }

    // Step 4: Create a merge request from the new branch to main
    const response = await axios.post(`${GITLAB_HOST_URL}/api/v4/projects/${selectedRepository?.id}/merge_requests`, {
      source_branch: branchName,
      target_branch: 'main',
      title: 'Merge Request: Developer changes to form_data.yaml',
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Merge request created:', response.data);
    submissionStatus.value = 'Your changes have been submitted for review.';
  }
  catch (error: any) {
    console.error('Error creating merge request:', error.response?.data || error.message);
    submissionStatus.value = 'Error submitting merge request.';
  }
}

const userAccessLevel = ref<number | null>(null);
function generateYamlData(): string {
  return stringify({
    contact: contact.value,
    businessPartnerContact: businessPartnerContact.value,
    businessPartnerDivisionFrc: businessPartnerDivisionFrc.value,
    dpmoJiraKey: dpmoJiraKey.value,
    peCode: peCode.value,
    wid: wid.value,
    fiscal: fiscal.value,
    gates: gates.value,
  });
}

const isLoading = ref(false); // Tracks the loading state

// Form submission handler
async function handleSubmit() {
  isLoading.value = true;

  try {
    const userAccessLevel = await fetchUserAccessLevel(selectedRepositoryId!);
    const OWNER_ACCESS_LEVEL = 50;
    const MAINTAINER_ACCESS_LEVEL = 40;
    const DEVELOPER_ACCESS_LEVEL = 30;

    console.log('User access level on submit:', userAccessLevel);

    if (userAccessLevel === null) {
      submissionStatus.value = 'Unable to determine your permissions. Please try again or contact support.';
      return;
    }

    if (!isLocked.value) {
      submissionStatus.value = 'Repository selection is not locked. Lock the selection before submitting.';
      return;
    }

    if (!selectedRepository) {
      submissionStatus.value = 'No repository selected.';
      return;
    }

    const yamlData = stringify({
      contact: contact.value,
      businessPartnerContact: businessPartnerContact.value,
      businessPartnerDivisionFrc: businessPartnerDivisionFrc.value,
      dpmoJiraKey: dpmoJiraKey.value,
      peCode: peCode.value,
      wid: wid.value,
      fiscal: fiscal.value,
      gates: gates.value,
    });

    if (userAccessLevel >= OWNER_ACCESS_LEVEL || userAccessLevel >= MAINTAINER_ACCESS_LEVEL) {
      await saveYamlToRepository(yamlData);
      submissionStatus.value = 'YAML file saved successfully!';
    }
    else if (userAccessLevel >= DEVELOPER_ACCESS_LEVEL) {
      await createMergeRequest(yamlData); // Developer submits a merge request
      submissionStatus.value = 'Your changes have been submitted for review.';
    }
    else {
      submissionStatus.value = 'You do not have permission to edit this file.';
    }
  }
  catch (error: any) {
    console.error('Error during submission:', error.response?.data || error.message);
    submissionStatus.value = 'Error during submission.';
  }
  finally {
    isLoading.value = false; // Ensure loading state is always stopped
  }
}

// Add fiscal years to fiscal array
function toggleFiscalYear(year: number) {
  if (fiscal.value.includes(year)) {
    fiscal.value = fiscal.value.filter(y => y !== year);
  }
  else {
    fiscal.value.push(year);
  }
}

onMounted(() => {
  fetchUserInfo();
  fetchRepositories();
});
</script>

<template>
  <u-container>
    <u-card class="mt-10 p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
      <template #header>
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Select a Repository and Submit Data
          </h1>
          <!-- Display user avatar and name -->
          <div
            v-if="userName && userAvatar"
            class="flex items-center space-x-2"
          >
            <img
              :src="userAvatar"
              alt="User Avatar"
              class="w-10 h-10 rounded-full shadow-md"
            >
            <span class="text-gray-700 dark:text-gray-200 font-semibold">{{ userName }}</span>
          </div>
        </div>
      </template>

      <div
        v-if="repositories.length === 0"
        class="p-4"
      >
        <u-alert
          type="info"
          dismissible
          class="dark:bg-gray-700 dark:text-gray-100"
        >
          No repositories found.
        </u-alert>
      </div>

      <div
        v-else
        class="space-y-6"
      >
        <!-- Loading message -->
        <div
          v-if="isLoading"
          class="text-gray-600 dark:text-gray-200 text-center"
        >
          Submitting your changes, please wait...
        </div>

        <!-- Repository Selection -->
        <div
          v-if="!isLoading"
          class="space-y-2"
        >
          <label class="block text-gray-700 dark:text-gray-200 font-medium">Repository</label>
          <select
            :disabled="isLocked"
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
            @change="handleRepositorySelection"
          >
            <option
              v-for="repo in repositories"
              :key="repo.id"
              :value="repo.id"
            >
              {{ repo.name }}
            </option>
          </select>

          <u-button
            v-if="!isLocked"
            class="mt-2 bg-green-500 hover:bg-green-600 text-white"
            @click="lockSelection"
          >
            Select Repository
          </u-button>
        </div>

        <p
          v-if="fileExistsStatus && !isLoading"
          class="text-sm text-gray-600 dark:text-gray-300"
        >
          {{ fileExistsStatus }}
        </p>

        <!-- Form to submit data -->
        <form
          v-if="isLocked && !isLoading"
          class="space-y-6"
          @submit.prevent="handleSubmit"
        >
          <!-- Project Contact Section -->
          <div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-100">
              Project Contact
            </h3>
            <u-input
              v-model="contact.name"
              label="Name"
              placeholder="Enter contact name"
              required
            />
            <u-input
              v-model="contact.email"
              label="Email"
              placeholder="Enter contact email"
              required
            />
          </div>

          <!-- Business Partner Contact Section -->
          <div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-100">
              Business Partner Contact
            </h3>
            <u-input
              v-model="businessPartnerContact.name"
              label="Name"
              placeholder="Enter contact name"
              required
            />
            <u-input
              v-model="businessPartnerContact.email"
              label="Email"
              placeholder="Enter contact email"
              required
            />
            <u-input
              v-model="businessPartnerDivisionFrc"
              label="Division FRC"
              placeholder="Enter division FRC"
              required
            />
          </div>

          <!-- Additional Information Section -->
          <div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-100">
              Additional Information
            </h3>
            <u-input
              v-model="dpmoJiraKey"
              label="DPMO Jira Key"
              placeholder="Enter DPMO Jira Key"
              required
            />
            <u-input
              v-model="peCode"
              label="PE Code"
              placeholder="Enter PE Code"
              required
            />
            <u-input
              v-model="wid"
              label="WID"
              placeholder="Enter WID"
              required
            />
          </div>

          <!-- Fiscal Year Selection -->
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-100">
              Fiscal Years
            </h3>
            <div class="flex space-x-4">
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :value="2023"
                  :checked="fiscal.includes(2023)"
                  class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-800 dark:border-gray-600"
                  @change="toggleFiscalYear(2023)"
                >
                <span class="text-gray-700 dark:text-gray-100">2023</span>
              </label>
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :value="2024"
                  :checked="fiscal.includes(2024)"
                  class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-800 dark:border-gray-600"
                  @change="toggleFiscalYear(2024)"
                >
                <span class="text-gray-700 dark:text-gray-100">2024</span>
              </label>
            </div>
          </div>

          <!-- Gates Section -->
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4">
            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-100">
              Gates
            </h3>

            <div class="space-y-4">
              <h4 class="font-medium text-gray-600 dark:text-gray-300">
                Accessibility
              </h4>
              <u-select
                v-model="gates.accessibility.status"
                :options="['planned', 'completed']"
                label="Status"
                class="w-full"
              />
              <u-input
                v-model="gates.accessibility.date"
                label="Completion Date"
                type="date"
                placeholder="Select Date"
                required
              />
            </div>

            <div class="space-y-4">
              <h4 class="font-medium text-gray-600 dark:text-gray-300">
                Authority to Operate
              </h4>
              <u-select
                v-model="gates.authorityToOperate.status"
                :options="['planned', 'completed']"
                label="Status"
                class="w-full"
              />
              <u-input
                v-model="gates.authorityToOperate.date"
                label="Completion Date"
                type="date"
                placeholder="Select Date"
                required
              />
            </div>
          </div>

          <!-- Submit Button -->
          <u-button
            type="submit"
            class="mt-4 bg-green-500 hover:bg-green-600 text-white"
          >
            Submit
          </u-button>
        </form>

        <!-- Display submission status -->
        <div
          v-if="submissionStatus && !isLoading"
          :class="submissionStatus.startsWith('Error') ? 'bg-red-500 text-white p-4 rounded' : 'bg-green-500 text-white p-4 rounded'"
          class="mt-4"
        >
          <p>{{ submissionStatus }}</p>
        </div>
      </div>
    </u-card>
  </u-container>
</template>
