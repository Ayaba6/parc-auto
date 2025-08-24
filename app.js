// Variable globale pour l'index du véhicule en cours d'édition
let carToEditIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    const addCarForm = document.getElementById('add-car-form');
    const searchInput = document.getElementById('search-input');

    // Événement pour la soumission du formulaire
    addCarForm.addEventListener('submit', handleFormSubmit);

    // Événement pour la recherche en temps réel
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        displayCars(searchTerm);
    });

    // Affiche la liste des véhicules au chargement initial
    displayCars();
});

// Gère l'ajout et la modification des véhicules
function handleFormSubmit(e) {
    e.preventDefault();

    // Appeler la fonction de validation
    if (!validateForm()) {
        return; // Arrêter la soumission si la validation échoue
    }
    
    const brand = document.getElementById('brand').value.trim();
    const model = document.getElementById('model').value.trim();
    const year = document.getElementById('year').value.trim();
    const maintenanceNote = document.getElementById('maintenance-note').value.trim();

    const newCar = {
        brand: brand,
        model: model,
        year: parseInt(year),
        maintenanceNote: maintenanceNote
    };

    let cars = JSON.parse(localStorage.getItem('cars')) || [];

    if (carToEditIndex === -1) {
        cars.push(newCar);
        showMessage('Véhicule ajouté avec succès !', 'alert-success');
    } else {
        cars[carToEditIndex] = newCar;
        carToEditIndex = -1;
        document.querySelector('button[type="submit"]').textContent = 'Ajouter le véhicule';
        document.querySelector('button[type="submit"]').classList.replace('btn-warning', 'btn-success');
        showMessage('Véhicule modifié avec succès !', 'alert-success');
    }

    localStorage.setItem('cars', JSON.stringify(cars));
    document.getElementById('add-car-form').reset();
    displayCars();
}

// Fonction pour valider les données du formulaire
function validateForm() {
    const brandInput = document.getElementById('brand');
    const modelInput = document.getElementById('model');
    const yearInput = document.getElementById('year');
    
    const brand = brandInput.value.trim();
    const model = modelInput.value.trim();
    const year = yearInput.value.trim();

    // Réinitialiser les messages d'erreur et les classes de validation
    brandInput.classList.remove('is-invalid');
    modelInput.classList.remove('is-invalid');
    yearInput.classList.remove('is-invalid');
    hideMessage(); // Cacher le message de confirmation/erreur principal

    let isValid = true;

    if (brand === '') {
        brandInput.classList.add('is-invalid');
        isValid = false;
    }
    
    if (model === '') {
        modelInput.classList.add('is-invalid');
        isValid = false;
    }

    const currentYear = new Date().getFullYear();
    if (year === '' || isNaN(year) || parseInt(year) > currentYear) {
        yearInput.classList.add('is-invalid');
        isValid = false;
    }

    if (!isValid) {
        showMessage('Veuillez corriger les champs en rouge.', 'alert-danger');
    }
    
    return isValid;
}

// Fonction pour afficher la liste des voitures avec ou sans filtre
function displayCars(searchTerm = '') {
    const carsListSection = document.getElementById('cars-list');
    const cars = JSON.parse(localStorage.getItem('cars')) || [];

    const filteredCars = cars.filter(car => {
        const carInfo = `${car.brand} ${car.model} ${car.year} ${car.maintenanceNote}`.toLowerCase();
        return carInfo.includes(searchTerm);
    });

    if (filteredCars.length === 0 && searchTerm === '') {
        carsListSection.innerHTML = '<p class="text-muted text-center">Aucun véhicule enregistré pour le moment.</p>';
        return;
    } else if (filteredCars.length === 0 && searchTerm !== '') {
        carsListSection.innerHTML = `<p class="text-muted text-center">Aucun résultat pour la recherche "${searchTerm}".</p>`;
        return;
    }

    let tableHTML = `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>Marque</th>
                    <th>Modèle</th>
                    <th>Année</th>
                    <th>Notes de maintenance</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredCars.forEach(car => {
        const originalIndex = cars.findIndex(c => c.brand === car.brand && c.model === car.model && c.year === car.year);
        tableHTML += `
            <tr>
                <td>${car.brand}</td>
                <td>${car.model}</td>
                <td>${car.year}</td>
                <td>${car.maintenanceNote || 'Aucune note'}</td>
                <td class="action-buttons text-center">
                    <button class="btn btn-warning btn-sm edit-btn" data-index="${originalIndex}">Modifier</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-index="${originalIndex}">Supprimer</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    carsListSection.innerHTML = tableHTML;

    // Ajoute les écouteurs d'événements pour les boutons de modification et de suppression
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexToEdit = parseInt(e.target.getAttribute('data-index'));
            loadCarForEdit(indexToEdit);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.target.getAttribute('data-index'));
            deleteCar(indexToDelete);
        });
    });
}

// Supprime un véhicule de la liste
function deleteCar(index) {
    let cars = JSON.parse(localStorage.getItem('cars')) || [];
    cars.splice(index, 1);
    localStorage.setItem('cars', JSON.stringify(cars));
    displayCars();
    showMessage('Véhicule supprimé avec succès !', 'alert-success');
}

// Charge les données d'un véhicule dans le formulaire pour l'édition
function loadCarForEdit(index) {
    const cars = JSON.parse(localStorage.getItem('cars'));
    const car = cars[index];

    document.getElementById('brand').value = car.brand;
    document.getElementById('model').value = car.model;
    document.getElementById('year').value = car.year;
    document.getElementById('maintenance-note').value = car.maintenanceNote || '';

    document.querySelector('button[type="submit"]').textContent = 'Modifier le véhicule';
    document.querySelector('button[type="submit"]').classList.replace('btn-success', 'btn-warning');
    
    carToEditIndex = index;
    showMessage('Modification du véhicule en cours.', 'alert-info');
}

// Fonction pour afficher des messages de confirmation/erreur
function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    messageContainer.textContent = message;
    messageContainer.className = `alert ${type} d-block`;
    setTimeout(() => {
        messageContainer.className = 'alert d-none';
    }, 3000);
}

// Fonction pour cacher le message d'alerte
function hideMessage() {
    document.getElementById('message-container').className = 'alert d-none';
}