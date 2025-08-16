/**
 * Project Tracker Application
 * Manages projects and tasks with real-time progress tracking and status updates
 *
 * Features:
 * - Project CRUD operations
 * - Task management within projects
 * - Automatic progress calculation
 * - Dynamic status updates
 * - Interactive UI with Bootstrap modals
 */

document.addEventListener("DOMContentLoaded", () => {
	/**
	 * DOM Element References
	 * @type {HTMLElement}
	 */
	const projectList = document.getElementById("project-list");
	const submitProjectBtn = document.getElementById("submitProjectBtn");
	const submitEditProjectBtn = document.getElementById("submitEditProjectBtn");
	const submitTaskBtn = document.getElementById("submitTaskBtn");
	const submitEditTaskBtn = document.getElementById("submitEditTaskBtn");

	/** @type {number|null} Current selected project ID */
	let currentProjectId = null;
	/** @type {number|null} Current selected task ID */
	let currentTaskId = null;
	/** @type {string} Base API endpoint */
	const endpoint = "http://localhost:5000";

	/**
	 * Fetches and displays all projects with their associated tasks
	 * Updates UI with project cards containing:
	 * - Project name and status
	 * - Progress bar
	 * - Task list in table format
	 * - Action buttons (Edit, Delete, Add Task)
	 * @async
	 * @returns {Promise<void>}
	 */
	async function loadProjects() {
		try {
			const projectResponse = await fetch(`${endpoint}/api/projects`);
			const projects = await projectResponse.json();

			if (!projects || projects.length === 0) {
				projectList.innerHTML =
					"<p class='text-center'>Tidak ada project ditemukan.</p>";
				return;
			}

			projectList.innerHTML = "";

			for (const project of projects) {
				const completionProgress = await calculateProjectProgress(project.id);

				const projectCard = `
          <div class="card mb-4">
            <div class="card-body">
              <h5 class="card-title">${project.name}</h5>
              <p class="card-text">Status: ${project.status}</p>
              
              <div class="mb-3">
                <p>Progress:</p>
                <div class="progress">
                  <div class="progress-bar" role="progressbar" style="width: ${completionProgress}%" aria-valuenow="${completionProgress}" aria-valuemin="0" aria-valuemax="100">${completionProgress}%</div>
                </div>
              </div>
              
              <!-- Buttons for Edit, Delete, and Add Task -->
              <button class="btn btn-warning btn-sm" onclick="openEditProjectModal(${
								project.id
							})">Edit Project</button>
              <button class="btn btn-danger btn-sm" onclick="deleteProject(${
								project.id
							})">Delete Project</button>
              <button class="btn btn-success btn-sm" onclick="openAddTaskModal(${
								project.id
							})">Add Task</button>

              <div class="task-list">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th scope="col">Nama</th>
                      <th scope="col">Status</th>
                      <th scope="col">Bobot</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${await loadTasks(project.id)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
				projectList.innerHTML += projectCard;

				await calculateAndLogProjectProgress(project.id);
			}
		} catch (error) {
			console.error("Error fetching projects:", error);
			projectList.innerHTML =
				"<p class='text-center text-danger'>Terjadi kesalahan saat memuat project.</p>";
		}
	}

	/**
	 * Loads and formats tasks for a specific project
	 * @async
	 * @param {number} project_id - Project identifier
	 * @returns {Promise<string>} HTML string containing task table rows
	 * @throws {Error} If fetching tasks fails
	 */
	async function loadTasks(project_id) {
		try {
			const taskResponse = await fetch(
				`${endpoint}/api/tasks/project/${project_id}`
			);
			if (!taskResponse.ok) {
				return "<tr><td colspan='4' class='text-center'>Tidak ada task ditemukan untuk project ini.</td></tr>";
			}

			const tasks = await taskResponse.json();
			if (!tasks || tasks.length === 0) {
				return "<tr><td colspan='4' class='text-center'>Tidak ada task ditemukan untuk project ini.</td></tr>";
			}

			return tasks
				.map((task) => {
					return `
          <tr>
            <td>${task.name}</td>
            <td>${task.status}</td>
            <td>${task.weight}</td>
            <td>
              <button class="btn btn-warning btn-sm" onclick="openEditTaskModal(${task.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
            </td>
          </tr>
        `;
				})
				.join("");
		} catch (error) {
			console.error(`Error fetching tasks for project ${project_id}:`, error);
			return "<tr><td colspan='4' class='text-center'>Tidak ada task ditemukan untuk project ini.</td></tr>";
		}
	}

	/**
	 * Calculates project completion percentage based on task weights
	 * Formula: (completedWeight / totalWeight) * 100
	 * @async
	 * @param {number} projectId - Project identifier
	 * @returns {Promise<number>} Completion percentage rounded to 2 decimal places
	 */
	async function calculateProjectProgress(projectId) {
		try {
			const taskResponse = await fetch(
				`${endpoint}/api/tasks/project/${projectId}`
			);
			const tasks = await taskResponse.json();

			if (!tasks || tasks.length === 0) {
				// console.log(`Project ID: ${projectId} has no tasks.`);
				return 0; // Return 0 if no tasks are found
			}

			let totalWeight = 0;
			let completedWeight = 0;

			tasks.forEach((task) => {
				totalWeight += task.weight;
				if (task.status === "done") {
					completedWeight += task.weight;
				}
			});

			const completionProgress = (completedWeight / totalWeight) * 100;
			return completionProgress.toFixed(2); // Return completion progress rounded to 2 decimal places
		} catch (error) {
			console.error(
				`Error calculating progress for project ${projectId}:`,
				error
			);
			return 0;
		}
	}

	/**
	 * Updates project progress and status after task changes
	 * @async
	 * @param {number} projectId - Project identifier
	 * @throws {Error} If calculation or update fails
	 */
	async function calculateAndUpdateProjectProgress(projectId) {
		// Check if project_id is null or invalid
		if (projectId === null || projectId === undefined) {
			console.log(
				"Skipping task loading because project_id is null or invalid."
			);
			return "<tr><td colspan='4' class='text-center'>Project ID is invalid.</td></tr>";
		}

		try {
			const taskResponse = await fetch(
				`${endpoint}/api/tasks/project/${projectId}`
			);
			const tasks = await taskResponse.json();

			if (!tasks || tasks.length === 0) {
				console.log(`Project ID: ${projectId} has no tasks.`);
				return;
			}

			let totalWeight = 0;
			let completedWeight = 0;

			tasks.forEach((task) => {
				totalWeight += task.weight;
				if (task.status === "done") {
					completedWeight += task.weight;
				}
			});

			const completionProgress = (completedWeight / totalWeight) * 100;
			// console.log(`Project ID: ${projectId}`);
			// console.log(`Completion Progress: ${completionProgress.toFixed(2)}%`);

			// Update project completion progress
			await updateProjectProgress(projectId, completionProgress.toFixed(2));

			// Now update project status based on task status
			await updateProjectStatus(projectId);
		} catch (error) {
			console.error(
				`Error calculating progress for project ${projectId}:`,
				error
			);
		}
	}

	/**
	 * Logs and updates project progress details
	 * - Calculates total weight
	 * - Tracks completed weight
	 * - Updates progress and status
	 * @async
	 * @param {number} projectId - Project identifier
	 */
	async function calculateAndLogProjectProgress(projectId) {
		try {
			const taskResponse = await fetch(
				`${endpoint}/api/tasks/project/${projectId}`
			);
			const tasks = await taskResponse.json();

			if (!tasks || tasks.length === 0) {
				console.log(`Project ID: ${projectId} has no tasks.`);
				return;
			}

			let totalWeight = 0;
			let completedWeight = 0;

			tasks.forEach((task) => {
				totalWeight += task.weight;
				if (task.status === "done") {
					completedWeight += task.weight;
				}
			});

			const completionProgress = (completedWeight / totalWeight) * 100;

			// console.log(`Project ID: ${projectId}`);
			// console.log(`Total Weight: ${totalWeight}`);
			// console.log(`Completed Weight: ${completedWeight}`);
			// console.log(`Completion Progress: ${completionProgress.toFixed(2)}%`);

			// Update project completion progress
			await updateProjectProgress(projectId, completionProgress.toFixed(2));

			// Now update project status based on task status
			await updateProjectStatus(projectId);
		} catch (error) {
			console.error(
				`Error calculating progress for project ${projectId}:`,
				error
			);
		}
	}

	/**
	 * Opens task edit modal with pre-populated data
	 * @param {number} task_id - Task identifier
	 */
	window.openEditTaskModal = function (task_id) {
		currentTaskId = task_id;
		fetch(`${endpoint}/api/tasks/${task_id}`)
			.then((response) => response.json())
			.then((task) => {
				document.getElementById("editTaskName").value = task.name;
				document.getElementById("editTaskStatus").value = task.status;
				document.getElementById("editTaskWeight").value = task.weight;
				const modal = new bootstrap.Modal(
					document.getElementById("editTaskModal")
				);
				modal.show();
			});
	};

	/**
	 * Updates project progress on server
	 * @async
	 * @param {number} projectId - Project identifier
	 * @param {number} progress - Progress percentage (0-100)
	 */
	async function updateProjectProgress(projectId, progress) {
		try {
			const response = await fetch(`${endpoint}/api/projects/${projectId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					completion_progress: progress,
				}),
			});

			if (response.ok) {
				// console.log(
				// 	`Project ID: ${projectId} updated successfully with progress: ${progress}%`
				// );
			} else {
				console.error(`Error updating progress for project ${projectId}`);
			}
		} catch (error) {
			console.error(`Error updating project progress for ${projectId}:`, error);
		}
	}

	/**
	 * Deletes task after user confirmation
	 * @async
	 * @param {number} task_id - Task identifier
	 */
	window.deleteTask = async function (task_id) {
		const confirmDelete = confirm("Are you sure you want to delete this task?");
		if (confirmDelete) {
			try {
				const response = await fetch(`${endpoint}/api/tasks/${task_id}`, {
					method: "DELETE",
				});

				if (response.ok) {
					loadProjects();
				} else {
					alert("Error deleting task.");
				}
			} catch (error) {
				console.error("Error deleting task:", error);
				alert("Error deleting task.");
			}
		}
	};

	// Open Edit Project Modal
	window.openEditProjectModal = function (project_id) {
		currentProjectId = project_id;
		fetch(`${endpoint}/api/projects/${project_id}`)
			.then((response) => response.json())
			.then((project) => {
				document.getElementById("editProjectName").value = project.name;
				// document.getElementById("editProjectStatus").value = project.status;
				const modal = new bootstrap.Modal(
					document.getElementById("editProjectModal")
				);
				modal.show();
			});
	};

	// Delete project
	window.deleteProject = async function (project_id) {
		const confirmDelete = confirm(
			"Are you sure you want to delete this project and its tasks?"
		);
		if (confirmDelete) {
			try {
				const response = await fetch(`${endpoint}/api/projects/${project_id}`, {
					method: "DELETE",
				});

				if (response.ok) {
					loadProjects();
				} else {
					alert("Error deleting project.");
				}
			} catch (error) {
				console.error("Error deleting project:", error);
				alert("Error deleting project.");
			}
		}
	};

	/**
	 * Updates project status based on task statuses
	 * Status Logic:
	 * - "done": All tasks completed
	 * - "in progress": Any task in progress
	 * - "draft": Default state
	 * @async
	 * @param {number} projectId - Project identifier
	 */
	async function updateProjectStatus(projectId) {
		try {
			const taskResponse = await fetch(
				`${endpoint}/api/tasks/project/${projectId}`
			);
			const tasks = await taskResponse.json();

			let projectStatus = "draft"; // Default status

			if (tasks.every((task) => task.status === "done")) {
				projectStatus = "done"; // All tasks are done
			} else if (tasks.some((task) => task.status === "in progress")) {
				projectStatus = "in progress"; // Any task is in progress
			}

			// Update project status
			const response = await fetch(`${endpoint}/api/projects/${projectId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: projectStatus,
				}),
			});

			if (response.ok) {
				// console.log(
				// 	`Project ID: ${projectId} updated successfully with status: ${projectStatus}`
				// );
			} else {
				console.error(`Error updating status for project ${projectId}`);
			}
		} catch (error) {
			console.error(`Error updating project status for ${projectId}:`, error);
		}
	}

	// Open Add Task Modal
	window.openAddTaskModal = function (project_id) {
		currentProjectId = project_id;
		const modal = new bootstrap.Modal(document.getElementById("addTaskModal"));
		modal.show();
	};

	// Event Listeners

	/**
	 * Handles new task creation
	 * - Validates input
	 * - Creates task
	 * - Updates project progress
	 * - Updates project status
	 */
	submitTaskBtn.addEventListener("click", async () => {
		const taskName = document.getElementById("taskName").value;
		const taskStatus = document.getElementById("taskStatus").value;
		const taskWeight = document.getElementById("taskWeight").value;

		try {
			const response = await fetch(`${endpoint}/api/tasks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					project_id: currentProjectId,
					name: taskName,
					status: taskStatus,
					weight: taskWeight,
				}),
			});

			if (response.ok) {
				loadProjects();
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("addTaskModal")
				);
				modal.hide();

				await calculateAndUpdateProjectProgress(currentProjectId);

				// Now update project status based on task status
				await updateProjectStatus(currentProjectId);
			} else {
				alert("Error adding task.");
			}
		} catch (error) {
			console.error("Error adding task:", error);
			alert("Error adding task.");
		}
	});

	/**
	 * Handles task editing
	 * - Updates task details
	 * - Recalculates project progress
	 * - Updates project status
	 */
	submitEditTaskBtn.addEventListener("click", async () => {
		const taskName = document.getElementById("editTaskName").value;
		const taskStatus = document.getElementById("editTaskStatus").value;
		const taskWeight = document.getElementById("editTaskWeight").value;

		try {
			const response = await fetch(`${endpoint}/api/tasks/${currentTaskId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: taskName,
					status: taskStatus,
					weight: taskWeight,
				}),
			});

			if (response.ok) {
				loadProjects();
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("editTaskModal")
				);
				modal.hide();

				// Update project progress after editing a task
				await calculateAndUpdateProjectProgress(currentProjectId);

				// Now update project status based on task status
				await updateProjectStatus(currentProjectId);
			} else {
				alert("Error editing task.");
			}
		} catch (error) {
			console.error("Error editing task:", error);
			alert("Error editing task.");
		}
	});

	/**
	 * Handles project editing
	 * - Updates project name
	 * - Refreshes project list
	 */
	submitEditProjectBtn.addEventListener("click", async () => {
		const projectName = document.getElementById("editProjectName").value;
		// const projectStatus = document.getElementById("editProjectStatus").value;

		if (!projectName) {
			alert("Please fill in all fields.");
			return;
		}

		try {
			const response = await fetch(
				`${endpoint}/api/projects/${currentProjectId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: projectName,
						// status: projectStatus,
					}),
				}
			);

			if (response.ok) {
				loadProjects();
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("editProjectModal")
				);
				modal.hide();
			} else {
				alert("Error editing project.");
			}
		} catch (error) {
			console.error("Error submitting project changes:", error);
			alert("Error submitting project changes.");
		}
	});

	/**
	 * Handles new project creation
	 * - Creates project with draft status
	 * - Sets initial progress to 0%
	 */
	submitProjectBtn.addEventListener("click", async () => {
		const projectName = document.getElementById("projectName").value;
		// const projectStatus = document.getElementById("projectStatus").value;

		if (!projectName) {
			alert("Please fill in all fields.");
			return;
		}

		try {
			const response = await fetch(`${endpoint}/api/projects`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: projectName,
					status: "draft",
					completion_progress: 0,
				}),
			});

			if (response.ok) {
				loadProjects();
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("createProjectModal")
				);
				modal.hide();
			} else {
				alert("Error creating project.");
			}
		} catch (error) {
			console.error("Error submitting project:", error);
			alert("Error submitting project.");
		}
	});

	// Initialize application by loading all projects
	loadProjects();
});
