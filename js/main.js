// Attendre que le DOM soit complètement chargé avant d'exécuter le code
document.addEventListener('DOMContentLoaded', () => {

    // 1. Sélectionner le formulaire par son ID
    const addCarForm = document.getElementById('add-car-form');

    // 2. Écouter la soumission du formulaire
    addCarForm.addEventListener('submit', (e) => {
        // Empêcher la page de se recharger
        e.preventDefault();

        // 3. Récupérer les valeurs des champs de saisie
        const brand = document.getElementById('brand').value;
        const model = document.getElementById('model').value;
        const year = document.getElementById('year').value;

        // 4. Afficher les valeurs pour vérifier que ça fonctionne
        console.log('Nouvelle voiture ajoutée :');
        console.log('Marque:', brand);
        console.log('Modèle:', model);
        console.log('Année:', year);

        // 5. Réinitialiser le formulaire après la soumission
        addCarForm.reset();
    });

});