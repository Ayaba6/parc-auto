// Importations nécessaires pour Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, addDoc, collection, onSnapshot, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variables globales pour Firebase
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialisation des services Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Référence aux collections Firestore
const trucksCollection = collection(db, `/artifacts/${appId}/public/data/trucks`);
const driversCollection = collection(db, `/artifacts/${appId}/public/data/drivers`);
const usersCollection = collection(db, `/artifacts/${appId}/public/data/users`);
const alertsCollection = collection(db, `/artifacts/${appId}/public/data/alerts`);

// Variable globale pour gérer l'état de l'application
let dataManager = {
    trucks: [],
    drivers: [],
    user: null,
    userRole: null,
    truckToEditId: null
};

// Fonction pour afficher une section et masquer les autres
function showSection(sectionId) {
    // Masque toutes les sections
    document.getElementById('menu-grid')?.classList.add('d-none');
    document.getElementById('add-truck-section')?.classList.add('d-none');
    document.getElementById('add-driver-section')?.classList.add('d-none');
    document.getElementById('assign-section')?.classList.add('d-none');
    document.getElementById('trucks-list-section')?.classList.add('d-none');
    document.getElementById('drivers-list-section')?.classList.add('d-none');
    document.getElementById('update-position-section')?.classList.add('d-none');
    document.getElementById('report-breakdown-section')?.classList.add('d-none');

    // Affiche la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }
}

// Fonction pour afficher un message à l'utilisateur
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

// Gère la soumission du formulaire de connexion
async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const q = query(usersCollection, where("username", "==", username), where("password", "==", password));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Simule la connexion
            await signInWithCustomToken(auth, initialAuthToken);
            
            dataManager.user = userData;
            dataManager.userRole = userData.role;

            if (dataManager.userRole === 'superviseur') {
                window.location.href = 'superviseur.html';
            } else if (dataManager.userRole === 'chauffeur') {
                window.location.href = 'driver.html';
            }
        } else {
            showMessage('Identifiants incorrects.', 'alert-danger');
        }
    } catch (error) {
        console.error("Erreur de connexion:", error);
        showMessage("Erreur de connexion. Veuillez réessayer.", 'alert-danger');
    }
}

// Fonction de déconnexion
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error("Erreur de déconnexion:", error);
    });
}

// ------------------------------------------ Logique pour Superviseur (superviseur.html) ------------------------------------------

function setupSuperviseurDashboard() {
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            showSection(targetId);
        });
    });

    document.getElementById('add-truck-form')?.addEventListener('submit', handleTruckFormSubmit);
    document.getElementById('add-driver-form')?.addEventListener('submit', handleAddDriverSubmit);
    document.getElementById('assign-form')?.addEventListener('submit', handleAssignmentSubmit);
}

// Écouteur en temps réel pour les camions
onSnapshot(trucksCollection, (snapshot) => {
    dataManager.trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayTrucks();
    populateAssignmentDropdowns();
    checkAlertsAndRender();
});

// Écouteur en temps réel pour les chauffeurs
onSnapshot(driversCollection, (snapshot) => {
    dataManager.drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayDrivers();
    populateAssignmentDropdowns();
});

// Écouteur en temps réel pour les alertes
onSnapshot(alertsCollection, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (window.renderAlerts) {
        window.renderAlerts(alerts);
    }
});

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
    dataManager.trucks.forEach((truck) => {
        const assignedDriver = dataManager.drivers.find(d => d.assignedTruckId === truck.id);
        const assignedDriverName = assignedDriver ? assignedDriver.name : 'Non assigné';

        let documentHtml = 'Aucun document';
        if (truck.document) {
            documentHtml = `<a href="${truck.document.data}" download="${truck.document.name}">Télécharger</a>`;
        }
        const technicalInspectionStatus = checkExpirationStatus(truck.technicalInspectionDate);
        const insuranceStatus = checkExpirationStatus(truck.insuranceDate);
        
        let locationHtml = 'Non renseigné';
        if (truck.location) {
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(truck.location)}`;
            locationHtml = `<a href="${mapUrl}" target="_blank">Voir sur la carte</a>`;
        }

        let statusHtml = '<span class="badge bg-success">OK</span>';
        if (truck.status === 'En panne') {
            statusHtml = `<span class="badge bg-danger">Panne (${truck.breakdown.type})</span>
                          <br><small class="text-muted">Déclarée le ${new Date(truck.breakdown.timestamp).toLocaleString()}</small>
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
                    <button class="btn btn-warning btn-sm edit-truck-btn" data-id="${truck.id}">Modifier</button>
                    <button class="btn btn-danger btn-sm delete-truck-btn" data-id="${truck.id}">Supprimer</button>
                </td>
            </tr>
        `;
    });
    trucksListSection.innerHTML = tableHTML;
    document.querySelectorAll('.edit-truck-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            loadTruckForEdit(e.target.getAttribute('data-id'));
        });
    });
    document.querySelectorAll('.delete-truck-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            deleteTruck(e.target.getAttribute('data-id'));
        });
    });
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
    dataManager.drivers.forEach((driver) => {
        const status = driver.assignedTruckId ? '<span class="badge bg-warning">Assigné</span>' : '<span class="badge bg-success">Disponible</span>';
        tableHTML += `
            <tr>
                <td>${driver.name}</td>
                <td>${driver.licence}</td>
                <td>${status}</td>
                <td class="action-buttons text-center">
                    <button class="btn btn-danger btn-sm delete-driver-btn" data-id="${driver.id}">Supprimer</button>
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
            deleteDriver(e.target.getAttribute('data-id'));
        });
    });
}

function populateAssignmentDropdowns() {
    const truckSelect = document.getElementById('truck-select');
    const driverSelect = document.getElementById('driver-select');
    if (truckSelect) {
      truckSelect.innerHTML = '<option value="">-- Sélectionner un camion --</option>';
      dataManager.trucks.forEach(truck => {
          const option = document.createElement('option');
          option.value = truck.id;
          option.textContent = `${truck.licence} (${truck.model})`;
          if (truck.assignedDriver) {
             option.disabled = true; // Empêche l'attribution d'un camion déjà attribué
          }
          truckSelect.appendChild(option);
      });
    }
    if (driverSelect) {
      driverSelect.innerHTML = '<option value="">-- Sélectionner un chauffeur --</option>';
      dataManager.drivers.forEach(driver => {
          if (!driver.assignedTruckId) {
              const option = document.createElement('option');
              option.value = driver.id;
              option.textContent = driver.name;
              driverSelect.appendChild(option);
          }
      });
    }
}

async function handleTruckFormSubmit(e) {
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

    let documentData = null;
    if (truckDocumentInput.files.length > 0) {
        const file = truckDocumentInput.files[0];
        documentData = { name: file.name, type: file.type, data: await fileToBase64(file) };
    }

    const truckData = {
        model: truckModel,
        capacity: parseInt(truckCapacity),
        licence: truckLicence,
        status: 'Disponible',
        location: null,
        assignedDriverId: null,
        technicalInspectionDate: technicalInspectionDate,
        insuranceDate: insuranceDate,
        document: documentData,
        breakdown: null
    };

    try {
        if (dataManager.truckToEditId) {
            await setDoc(doc(trucksCollection, dataManager.truckToEditId), truckData, { merge: true });
            showMessage('Camion modifié avec succès !', 'alert-success');
        } else {
            await addDoc(trucksCollection, truckData);
            showMessage('Camion ajouté avec succès !', 'alert-success');
        }
        document.getElementById('add-truck-form').reset();
        dataManager.truckToEditId = null;
        document.querySelector('#add-truck-section button[type="submit"]').textContent = 'Ajouter le camion';
        document.querySelector('#add-truck-section button[type="submit"]').classList.replace('btn-warning', 'btn-success');
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du camion:", error);
        showMessage("Erreur lors de la sauvegarde du camion.", 'alert-danger');
    }
}

async function handleAddDriverSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('driver-name').value.trim();
    const licence = document.getElementById('driver-licence').value.trim();
    if (!name || !licence) {
        showMessage('Veuillez remplir tous les champs.', 'alert-danger');
        return;
    }
    const newDriver = {
        name: name,
        licence: licence,
        assignedTruckId: null
    };
    try {
        await addDoc(driversCollection, newDriver);
        showMessage('Chauffeur ajouté avec succès !', 'alert-success');
        document.getElementById('add-driver-form').reset();
    } catch (error) {
        console.error("Erreur lors de l'ajout du chauffeur:", error);
        showMessage("Erreur lors de l'ajout du chauffeur.", 'alert-danger');
    }
}

async function handleAssignmentSubmit(e) {
    e.preventDefault();
    const truckId = document.getElementById('truck-select').value;
    const driverId = document.getElementById('driver-select').value;
    if (!truckId || !driverId) {
        showMessage('Veuillez sélectionner un camion ET un chauffeur.', 'alert-danger');
        return;
    }
    try {
        // Désassigner l'ancien chauffeur si le camion était déjà attribué
        const oldTruck = dataManager.trucks.find(t => t.id === truckId);
        if (oldTruck && oldTruck.assignedDriverId) {
            const oldDriverRef = doc(driversCollection, oldTruck.assignedDriverId);
            await setDoc(oldDriverRef, { assignedTruckId: null }, { merge: true });
        }
        
        // Attribuer le nouveau chauffeur au camion
        const truckRef = doc(trucksCollection, truckId);
        await setDoc(truckRef, { assignedDriverId: driverId }, { merge: true });
        
        // Attribuer le camion au chauffeur
        const driverRef = doc(driversCollection, driverId);
        await setDoc(driverRef, { assignedTruckId: truckId }, { merge: true });

        showMessage('Camion attribué avec succès !', 'alert-success');
    } catch (error) {
        console.error("Erreur lors de l'attribution:", error);
        showMessage("Erreur lors de l'attribution.", 'alert-danger');
    }
}

async function deleteTruck(id) {
    try {
        const truckRef = doc(trucksCollection, id);
        const truck = dataManager.trucks.find(t => t.id === id);
        if (truck && truck.assignedDriverId) {
            const driverRef = doc(driversCollection, truck.assignedDriverId);
            await setDoc(driverRef, { assignedTruckId: null }, { merge: true });
        }
        await deleteDoc(truckRef);
        showMessage('Camion supprimé avec succès.', 'alert-success');
    } catch (error) {
        console.error("Erreur lors de la suppression du camion:", error);
        showMessage("Erreur lors de la suppression du camion.", 'alert-danger');
    }
}

async function deleteDriver(id) {
    try {
        const driverRef = doc(driversCollection, id);
        const driver = dataManager.drivers.find(d => d.id === id);
        if (driver && driver.assignedTruckId) {
            const truckRef = doc(trucksCollection, driver.assignedTruckId);
            await setDoc(truckRef, { assignedTruckId: null }, { merge: true });
        }
        await deleteDoc(driverRef);
        showMessage('Chauffeur supprimé avec succès.', 'alert-success');
    } catch (error) {
        console.error("Erreur lors de la suppression du chauffeur:", error);
        showMessage("Erreur lors de la suppression du chauffeur.", 'alert-danger');
    }
}

function loadTruckForEdit(id) {
    const truck = dataManager.trucks.find(t => t.id === id);
    if (!truck) {
        showMessage('Camion non trouvé.', 'alert-danger');
        return;
    }
    document.getElementById('truck-model').value = truck.model;
    document.getElementById('truck-capacity').value = truck.capacity;
    document.getElementById('truck-licence').value = truck.licence;
    document.getElementById('technical-inspection-date').value = truck.technicalInspectionDate;
    document.getElementById('insurance-date').value = truck.insuranceDate;
    dataManager.truckToEditId = id;
    showSection('add-truck-section');
    showMessage('Modification du camion en cours.', 'alert-info');
    document.querySelector('#add-truck-section button[type="submit"]').textContent = 'Modifier le camion';
    document.querySelector('#add-truck-section button[type="submit"]').classList.replace('btn-success', 'btn-warning');
}

// ------------------------------------------ Logique pour Chauffeur (driver.html) ------------------------------------------

function setupDriverDashboard() {
    // Récupère les cartes du menu et ajoute des écouteurs d'événements
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            showSection(targetId);
        });
    });
    // Écouteurs pour les formulaires de contenu du chauffeur
    document.getElementById('position-form')?.addEventListener('submit', handlePositionSubmit);
    document.getElementById('breakdown-form')?.addEventListener('submit', handleBreakdownSubmit);

    // Mettre à jour le nom du chauffeur si l'utilisateur est connecté
    if (dataManager.user) {
        document.getElementById('driver-name-display').textContent = dataManager.user.name;
    }
}

async function handlePositionSubmit(e) {
    e.preventDefault();
    const location = document.getElementById('truck-location').value.trim();
    if (!location) {
        showMessage('Veuillez remplir le champ de localisation.', 'alert-danger');
        return;
    }

    try {
        const truck = dataManager.trucks.find(t => t.assignedDriverId === dataManager.user.id);
        if (!truck) {
            showMessage('Aucun camion assigné à ce chauffeur.', 'alert-danger');
            return;
        }
        const truckRef = doc(trucksCollection, truck.id);
        await setDoc(truckRef, { location: location }, { merge: true });
        showMessage('Position du camion mise à jour avec succès !', 'alert-success');
        document.getElementById('position-form').reset();
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la position:", error);
        showMessage("Erreur lors de la mise à jour de la position.", 'alert-danger');
    }
}

async function handleBreakdownSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('breakdown-type').value;
    const description = document.getElementById('breakdown-description').value.trim();
    if (!type || !description) {
        showMessage('Veuillez remplir tous les champs.', 'alert-danger');
        return;
    }

    try {
        const truck = dataManager.trucks.find(t => t.assignedDriverId === dataManager.user.id);
        if (!truck) {
            showMessage('Aucun camion assigné à ce chauffeur.', 'alert-danger');
            return;
        }

        const truckRef = doc(trucksCollection, truck.id);
        await setDoc(truckRef, { status: 'En panne', breakdown: { type, description, timestamp: new Date().toISOString() } }, { merge: true });
        
        // Créer une alerte dans la collection d'alertes
        await addDoc(alertsCollection, {
            type: 'breakdown',
            message: `Panne ${type} déclarée par le chauffeur ${dataManager.user.name} sur le camion ${truck.licence}.`,
            timestamp: new Date().toISOString()
        });

        showMessage('Panne déclarée avec succès !', 'alert-success');
        document.getElementById('breakdown-form').reset();
    } catch (error) {
        console.error("Erreur lors de la déclaration de la panne:", error);
        showMessage("Erreur lors de la déclaration de la panne.", 'alert-danger');
    }
}

// ------------------------------------------ Fonctions utilitaires ------------------------------------------

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

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function handleDismissAlert(alertId) {
    try {
        const alertRef = doc(alertsCollection, alertId);
        await deleteDoc(alertRef);
        showMessage('Alerte traitée avec succès !', 'alert-success');
    } catch (error) {
        console.error("Erreur lors du traitement de l'alerte:", error);
        showMessage("Erreur lors du traitement de l'alerte.", 'alert-danger');
    }
}
window.handleDismissAlert = handleDismissAlert;

// Gérer l'état d'authentification et lancer la bonne interface
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // L'utilisateur est connecté, on peut récupérer ses infos
        const q = query(usersCollection, where("uid", "==", user.uid));
        const userDocs = await getDocs(q);
        if (!userDocs.empty) {
            const userData = userDocs.docs[0].data();
            dataManager.user = { id: userDocs.docs[0].id, ...userData };
            dataManager.userRole = userData.role;
        }

        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'superviseur.html' || currentPage === 'index.html') {
            setupSuperviseurDashboard();
        } else if (currentPage === 'driver.html') {
            setupDriverDashboard();
        }
    } else {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'login.html' || currentPage === '') {
            document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
        } else {
            // Si le rôle n'est pas défini, on redirige vers la page de connexion
            window.location.href = 'login.html';
        }
    }
});

// Gérer le cas où la connexion initiale est anonyme
if (initialAuthToken) {
    signInWithCustomToken(auth, initialAuthToken).catch(error => {
        console.error("Erreur de connexion initiale:", error);
    });
} else {
    signInAnonymously(auth).catch(error => {
        console.error("Erreur de connexion anonyme:", error);
    });
}
