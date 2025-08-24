// Variable globale pour gérer l'état de l'application
let dataManager = {
    trucks: [],
    drivers: [],
    truckToEditIndex: -1
};

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'login.html' || currentPage === '') {
        // Logique pour la page de connexion
        document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
    } else {
        // Logique pour les pages d'application (superviseur et chauffeur)
        const userRole = localStorage.getItem('userRole');
        if (!userRole) {
            // Si le rôle n'est pas défini, on redirige vers la page de connexion
            window.location.href = 'login.html';
            return;
        }

        dataManager.trucks = JSON.parse(localStorage.getItem('trucks')) || [];
        dataManager.drivers = JSON.parse(localStorage.getItem('drivers')) || [];

        if (userRole === 'superviseur') {
            // Logique pour le tableau de bord du superviseur
            setupSuperviseurDashboard();
        } else if (userRole === 'chauffeur') {
            // Logique pour l'interface du chauffeur
            setupDriverDashboard();
        }
    }
});

function setupSuperviseurDashboard() {
    // Récupère les cartes du menu et ajoute des écouteurs d'événements
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            showSection(targetId);
        });
    });

    // Écouteurs pour les formulaires de contenu
    document.getElementById('add-truck-form').addEventListener('submit', handleTruckFormSubmit);
    document.getElementById('add-driver-form').addEventListener('submit', handleAddDriverSubmit);
    document.getElementById('assign-form').addEventListener('submit', handleAssignmentSubmit);
    
    // On charge les données et on les affiche pour la première fois
    displayTrucks();
    displayDrivers();
    populateAssignmentDropdowns();
}

function setupDriverDashboard() {
    const userName = localStorage.getItem('username');
    if (userName) {
        document.getElementById('driver-name-display').textContent = userName;
    }
    // Récupère les cartes du menu et ajoute des écouteurs d'événements
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            showSection(targetId);
        });
    });
    // Écouteurs pour les formulaires de contenu du chauffeur
    document.getElementById('position-form').addEventListener('submit', handlePositionSubmit);
    document.getElementById('breakdown-form').addEventListener('submit', handleBreakdownSubmit);
}

// Fonction pour afficher une section et masquer les autres
function showSection(sectionId) {
    // Masque toutes les sections du superviseur
    document.getElementById('menu-grid')?.classList.add('d-none');
    document.getElementById('add-truck-section')?.classList.add('d-none');
    document.getElementById('add-driver-section')?.classList.add('d-none');
    document.getElementById('assign-section')?.classList.add('d-none');
    document.getElementById('trucks-list-section')?.classList.add('d-none');
    document.getElementById('drivers-list-section')?.classList.add('d-none');

    // Masque toutes les sections du chauffeur
    document.getElementById('update-position-section')?.classList.add('d-none');
    document.getElementById('report-breakdown-section')?.classList.add('d-none');

    // Affiche la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }
}

// Gère la soumission du formulaire de connexion
function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === 'superviseur' && password === 'admin123') {
        localStorage.setItem('userRole', 'superviseur');
        localStorage.setItem('username', username);
        window.location.href = 'index.html';
    } else if (username === 'chauffeur' && password === 'pass123') {
        localStorage.setItem('userRole', 'chauffeur');
        localStorage.setItem('username', username);
        window.location.href = 'driver.html';
    } else {
        showMessage('Identifiants incorrects.', 'alert-danger');
    }
}

// ------------------------------------------ Fonctions pour Superviseur (index.html) ------------------------------------------

function handleAddDriverSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('driver-name').value.trim();
    const licence = document.getElementById('driver-licence').value.trim();
    if (!name || !licence) {
        showMessage('Veuillez remplir tous les champs.', 'alert-danger');
        return;
    }
    const newDriver = {
        id: Date.now(),
        name: name,
        licence: licence,
        isAssigned: false
    };
    dataManager.drivers.push(newDriver);
    localStorage.setItem('drivers', JSON.stringify(dataManager.drivers));
    showMessage('Chauffeur ajouté avec succès !', 'alert-success');
    document.getElementById('add-driver-form').reset();
    displayDrivers();
    populateAssignmentDropdowns();
}

function handleAssignmentSubmit(e) {
    e.preventDefault();
    const truckIndex = document.getElementById('truck-select').value;
    const driverId = document.getElementById('driver-select').value;
    if (truckIndex === "" || driverId === "") {
        showMessage('Veuillez sélectionner un camion ET un chauffeur.', 'alert-danger');
        return;
    }
    const truck = dataManager.trucks[truckIndex];
    const driver = dataManager.drivers.find(d => d.id == driverId);
    if (driver.isAssigned) {
        showMessage(`Le chauffeur ${driver.name} est déjà assigné à un camion.`, 'alert-danger');
        return;
    }
    if (truck.assignedDriver) {
        const oldDriver = dataManager.drivers.find(d => d.id == truck.assignedDriver);
        if (oldDriver) {
            oldDriver.isAssigned = false;
                localStorage.setItem('drivers', JSON.stringify(dataManager.drivers));
            }
    }
    truck.assignedDriver = driver.id;
    driver.isAssigned = true;
    localStorage.setItem('trucks', JSON.stringify(dataManager.trucks));
    localStorage.setItem('drivers', JSON.stringify(dataManager.drivers));
    showMessage('Camion attribué avec succès !', 'alert-success');
    displayTrucks();
    displayDrivers();
    populateAssignmentDropdowns();
}

function displayDrivers() {
    const driversListSection = document.getElementById('drivers-list');
    if (!driversListSection) return;
    if (dataManager.drivers.length === 0) {
        driversListSection.innerHTML = '<p class="text-muted text-center">Aucun chauffeur enregistré pour le moment.</p>';
        return;
    }
    let tableHTML = `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>Nom</th>
                    <th>Permis</th>
                    <th>Statut</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    dataManager.drivers.forEach((driver, index) => {
        const status = driver.isAssigned ? '<span class="badge bg-warning">Assigné</span>' : '<span class="badge bg-success">Disponible</span>';
        tableHTML += `
            <tr>
                <td>${driver.name}</td>
                <td>${driver.licence}</td>
                <td>${status}</td>
                <td class="action-buttons text-center">
                    <button class="btn btn-danger btn-sm delete-driver-btn" data-index="${index}">Supprimer</button>
                </td>
            </tr>
        `;
    });
    tableHTML += `
            </tbody>
        </table>
    `;
    driversListSection.innerHTML = tableHTML;
    document.querySelectorAll('.delete-driver-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            deleteDriver(index);
        });
    });
}

function populateAssignmentDropdowns() {
    const truckSelect = document.getElementById('truck-select');
    const driverSelect = document.getElementById('driver-select');
    if (truckSelect) {
      truckSelect.innerHTML = '<option value="">-- Sélectionner un camion --</option>';
      dataManager.trucks.forEach((truck, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = `${truck.licence} (${truck.model})`;
          truckSelect.appendChild(option);
      });
    }
    if (driverSelect) {
      driverSelect.innerHTML = '<option value="">-- Sélectionner un chauffeur --</option>';
      dataManager.drivers.forEach(driver => {
          if (!driver.isAssigned) {
              const option = document.createElement('option');
              option.value = driver.id;
              option.textContent = driver.name;
              driverSelect.appendChild(option);
          }
      });
    }
}

function deleteDriver(index) {
    const driverId = dataManager.drivers[index].id;
    const truck = dataManager.trucks.find(t => t.assignedDriver == driverId);
    if (truck) {
        truck.assignedDriver = null;
    }
    dataManager.drivers.splice(index, 1);
    localStorage.setItem('drivers', JSON.stringify(dataManager.drivers));
    localStorage.setItem('trucks', JSON.stringify(dataManager.trucks));
    displayDrivers();
    displayTrucks();
    populateAssignmentDropdowns();
    showMessage('Chauffeur supprimé avec succès.', 'alert-success');
}

function handleTruckFormSubmit(e) {
    e.preventDefault();
    const truckModel = document.getElementById('truck-model').value.trim();
    const truckCapacity = document.getElementById('truck-capacity').value.trim();
    const truckLicence = document.getElementById('truck-licence').value.trim();
    const technicalInspectionDate = document.getElementById('technical-inspection-date').value;
    const insuranceDate = document.getElementById('insurance-date').value;
    const truckDocumentInput = document.getElementById('truck-document');
    let isValid = true;
    if (!truckModel || !truckCapacity || isNaN(truckCapacity) || !truckLicence || !technicalInspectionDate || !insuranceDate) {
        showMessage('Veuillez remplir tous les champs obligatoires.', 'alert-danger');
        isValid = false;
    }
    if (!isValid) return;
    if (truckDocumentInput.files.length > 0) {
        const file = truckDocumentInput.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileData = {
                name: file.name,
                data: event.target.result,
                type: file.type
            };
            saveTruck(truckModel, truckCapacity, truckLicence, technicalInspectionDate, insuranceDate, fileData);
        };
        reader.readAsDataURL(file);
    } else {
        saveTruck(truckModel, truckCapacity, truckLicence, technicalInspectionDate, insuranceDate, null);
    }
}

function saveTruck(model, capacity, licence, technicalInspectionDate, insuranceDate, document) {
    const newTruck = {
        model: model,
        capacity: parseInt(capacity),
        licence: licence,
        status: 'Disponible',
        location: null,
        assignedDriver: null,
        technicalInspectionDate: technicalInspectionDate,
        insuranceDate: insuranceDate,
        document: document,
        breakdown: null
    };
    if (dataManager.truckToEditIndex === -1) {
        dataManager.trucks.push(newTruck);
        showMessage('Camion ajouté avec succès !', 'alert-success');
    } else {
        const truckToUpdate = dataManager.trucks[dataManager.truckToEditIndex];
        truckToUpdate.model = model;
        truckToUpdate.capacity = parseInt(capacity);
        truckToUpdate.licence = licence;
        truckToUpdate.technicalInspectionDate = technicalInspectionDate;
        truckToUpdate.insuranceDate = insuranceDate;
        if (document) {
            truckToUpdate.document = document;
        }
        dataManager.truckToEditIndex = -1;
        document.querySelector('#add-truck-section button[type="submit"]').textContent = 'Ajouter le camion';
        document.querySelector('#add-truck-section button[type="submit"]').classList.replace('btn-warning', 'btn-success');
        showMessage('Camion modifié avec succès !', 'alert-success');
    }
    localStorage.setItem('trucks', JSON.stringify(dataManager.trucks));
    document.getElementById('add-truck-form').reset();
    displayTrucks();
    populateAssignmentDropdowns();
}

function displayTrucks() {
    const trucksListSection = document.getElementById('trucks-list');
    if (!trucksListSection) return;
    if (dataManager.trucks.length === 0) {
        trucksListSection.innerHTML = '<p class="text-muted text-center">Aucun camion enregistré pour le moment.</p>';
        return;
    }
    let tableHTML = `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>Modèle</th>
                    <th>Plaque</th>
                    <th>Chauffeur</th>
                    <th>Position</th>
                    <th>État</th>
                    <th>Visite Technique</th>
                    <th>Assurance</th>
                    <th>Document</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    dataManager.trucks.forEach((truck, index) => {
        let assignedDriverName = 'Non assigné';
        if (truck.assignedDriver) {
            const driver = dataManager.drivers.find(d => d.id === truck.assignedDriver);
            if (driver) {
                assignedDriverName = driver.name;
            }
        }
        let documentHtml = 'Aucun document';
        if (truck.document) {
            documentHtml = `<a href="${truck.document.data}" download="${truck.document.name}">${truck.document.name}</a>`;
        }
        const technicalInspectionStatus = checkExpirationStatus(truck.technicalInspectionDate);
        const insuranceStatus = checkExpirationStatus(truck.insuranceDate);
        let locationHtml = 'Non renseigné';
        if (truck.location) {
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(truck.location)}`;
            locationHtml = `<a href="${mapUrl}" target="_blank">Voir sur la carte</a>`;
        }
        let statusHtml = 'OK';
        if (truck.breakdown) {
            const breakdownTime = new Date(truck.breakdown.timestamp).toLocaleString();
            statusHtml = `<span class="badge bg-danger">Panne (${truck.breakdown.type})</span>
                          <br><small class="text-muted">Déclarée le ${breakdownTime}</small>
                          <br><small>Description: ${truck.breakdown.description}</small>`;
        }
        tableHTML += `
            <tr>
                <td>${truck.model}</td>
                <td>${truck.licence}</td>
                <td>${assignedDriverName}</td>
                <td>${locationHtml}</td>
                <td>${statusHtml}</td>
                <td><span class="${technicalInspectionStatus.class}">${truck.technicalInspectionDate}</span></td>
                <td><span class="${insuranceStatus.class}">${truck.insuranceDate}</span></td>
                <td>${documentHtml}</td>
                <td class="action-buttons text-center">
                    <button class="btn btn-warning btn-sm edit-truck-btn" data-index="${index}">Modifier</button>
                    <button class="btn btn-danger btn-sm delete-truck-btn" data-index="${index}">Supprimer</button>
                </td>
            </tr>
        `;
    });
    trucksListSection.innerHTML = tableHTML;
    document.querySelectorAll('.edit-truck-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            loadTruckForEdit(index);
        });
    });
    document.querySelectorAll('.delete-truck-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            deleteTruck(index);
        });
    });
}

function loadTruckForEdit(index) {
    const truck = dataManager.trucks[index];
    document.getElementById('truck-model').value = truck.model;
    document.getElementById('truck-capacity').value = truck.capacity;
    document.getElementById('truck-licence').value = truck.licence;
    document.getElementById('technical-inspection-date').value = truck.technicalInspectionDate;
    document.getElementById('insurance-date').value = truck.insuranceDate;
    dataManager.truckToEditIndex = index;
    showSection('add-truck-section');
    showMessage('Modification du camion en cours.', 'alert-info');
    document.querySelector('#add-truck-section button[type="submit"]').textContent = 'Ajouter le camion';
    document.querySelector('#add-truck-section button[type="submit"]').classList.replace('btn-success', 'btn-warning');
}

function deleteTruck(index) {
        const truckToDelete = dataManager.trucks[index];
        const assignedDriverId = truckToDelete.assignedDriver;
        dataManager.trucks.splice(index, 1);
        localStorage.setItem('trucks', JSON.stringify(dataManager.trucks));
        if (assignedDriverId) {
            const driver = dataManager.drivers.find(d => d.id === assignedDriverId);
            if (driver) {
                driver.isAssigned = false;
                localStorage.setItem('drivers', JSON.stringify(dataManager.drivers));
            }
        }
        displayTrucks();
        displayDrivers();
        populateAssignmentDropdowns();
        showMessage('Camion supprimé avec succès.', 'alert-success');
    }

function checkExpirationStatus(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expirationDate = new Date(dateString);
    expirationDate.setHours(0, 0, 0, 0);
    const timeDifference = expirationDate.getTime() - today.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    if (daysDifference < 0) {
        return { class: 'alert-date-expired' };
    } else if (daysDifference <= 30) {
        return { class: 'alert-date-approaching' };
    } else {
        return { class: 'alert-date-valid' };
    }
}

function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
      messageContainer.textContent = message;
      messageContainer.className = `alert ${type} d-block`;
      setTimeout(() => {
          messageContainer.className = 'alert d-none';
      }, 3000);
    }
}

function hideMessage() {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
      messageContainer.className = 'alert d-none';
    }
}

// ------------------------------------------ Fonctions pour Chauffeur (driver.html) ------------------------------------------

function handlePositionSubmit(e) {
    e.preventDefault();
    const userName = localStorage.getItem('username');
    const driver = dataManager.drivers.find(d => d.name === userName);
    if (!driver) {
        showMessage('Chauffeur non trouvé. Veuillez vous reconnecter.', 'alert-danger');
        return;
    }
    const truck = dataManager.trucks.find(t => t.assignedDriver === driver.id);
    if (!truck) {
        showMessage('Aucun camion assigné à ce chauffeur.', 'alert-danger');
        return;
    }
    const location = document.getElementById('truck-location').value.trim();
    if (!location) {
        showMessage('Veuillez remplir le champ de localisation.', 'alert-danger');
        return;
    }
    truck.location = location;
    localStorage.setItem('trucks', JSON.stringify(dataManager.trucks));
    showMessage('Position du camion mise à jour avec succès !', 'alert-success');
    document.getElementById('position-form').reset();
}

function handleBreakdownSubmit(e) {
    e.preventDefault();
    const userName = localStorage.getItem('username');
    const driver = dataManager.drivers.find(d => d.name === userName);
    if (!driver) {
        showMessage('Chauffeur non trouvé. Veuillez vous reconnecter.', 'alert-danger');
        return;
    }
    const truck = dataManager.trucks.find(t => t.assignedDriver === driver.id);
    if (!truck) {
        showMessage('Aucun camion assigné à ce chauffeur.', 'alert-danger');
        return;
    }
    const type = document.getElementById('breakdown-type').value;
    const description = document.getElementById('breakdown-description').value.trim();
    if (!type || !description) {
        showMessage('Veuillez remplir tous les champs.', 'alert-danger');
        return;
    }
    truck.breakdown = { type, description, timestamp: new Date().toISOString() };
    localStorage.setItem('trucks', JSON.stringify(dataManager.trucks));
    showMessage('Panne déclarée avec succès !', 'alert-success');
    document.getElementById('breakdown-form').reset();
}
