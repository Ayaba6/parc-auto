document.addEventListener('DOMContentLoaded', () => {

    const addCarForm = document.getElementById('add-car-form');

    // Écoute l'événement de soumission du formulaire
    addCarForm.addEventListener('submit', (e) => {
        // Empêche la page de se recharger
        e.preventDefault();

        // Récupère les valeurs des champs du formulaire
        const brand = document.getElementById('brand').value;
        const model = document.getElementById('model').value;
        const year = document.getElementById('year').value;

        // Crée un objet pour la nouvelle voiture
        const newCar = {
            brand: brand,
            model: model,
            year: year
        };

        // Récupère la liste de voitures existante ou crée un tableau vide si elle n'existe pas
        let cars = JSON.parse(localStorage.getItem('cars')) || [];

        // Ajoute la nouvelle voiture à la liste
        cars.push(newCar);

        // Sauvegarde la liste mise à jour dans le localStorage
        localStorage.setItem('cars', JSON.stringify(cars));

        // Réinitialise le formulaire
        addCarForm.reset();

        // Met à jour l'affichage des véhicules
        displayCars();
    });

    // Affiche les véhicules déjà sauvegardés au chargement de la page
    displayCars();
});

// Fonction pour afficher la liste des voitures
function displayCars() {
    // Sélectionne l'élément HTML où le tableau sera affiché
    const carsListSection = document.getElementById('cars-list');

    // Récupère les voitures du localStorage
    const cars = JSON.parse(localStorage.getItem('cars')) || [];

    // Si la liste est vide, affiche un message
    if (cars.length === 0) {
        carsListSection.innerHTML = '<p>Aucun véhicule enregistré pour le moment.</p>';
        return;
    }

    // Crée le tableau HTML pour l'affichage
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Marque</th>
                    <th>Modèle</th>
                    <th>Année</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Parcourt la liste des voitures et crée une ligne de tableau pour chaque
    cars.forEach((car, index) => {
        tableHTML += `
            <tr>
                <td>${car.brand}</td>
                <td>${car.model}</td>
                <td>${car.year}</td>
                <td><button class="delete-btn" data-index="${index}">Supprimer</button></td>
            </tr>
        `;
    });

    // Ferme le tableau
    tableHTML += `
            </tbody>
        </table>
    `;

    // Insère le tableau complet dans la page
    carsListSection.innerHTML = tableHTML;

    // Ajoute les écouteurs d'événements pour les boutons de suppression
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.target.getAttribute('data-index'));
            deleteCar(indexToDelete);
        });
    });
}

// Fonction pour supprimer un véhicule
function deleteCar(index) {
    // Récupère la liste des voitures
    let cars = JSON.parse(localStorage.getItem('cars')) || [];

    // Supprime le véhicule à l'index donné
    cars.splice(index, 1);

    // Met à jour le localStorage avec la nouvelle liste
    localStorage.setItem('cars', JSON.stringify(cars));

    // Réaffiche la liste mise à jour
    displayCars();
}