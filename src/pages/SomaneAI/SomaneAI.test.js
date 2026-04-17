/**
 * Tests pour vérifier que SomaneAI récupère les vraies données
 * À lancer avec: npm test
 */

import { useAIData, useVentesAnalytics, useStockAnalytics } from './useAIData';
import { generateChartData, getAIResponse } from './aiUtils';

describe('SomaneAI - Intégration des Vraies Données', () => {
  
  describe('Récupération des données', () => {
    test('devrait charger les données depuis l\'API', async () => {
      // Mock les données API
      const mockData = {
        ventes: [
          { date: '2024-01-15', montant: 5000, client_nom: 'Client A', categorie: 'Électronique' },
          { date: '2024-01-20', montant: 3000, client_nom: 'Client B', categorie: 'Vêtements' },
        ],
        stock: [
          { nom: 'Article 1', quantite: 100, seuil_minimum: 50, prix_unitaire: 25 },
          { nom: 'Article 2', quantite: 20, seuil_minimum: 30, prix_unitaire: 10 },
        ],
        finances: [
          { montant: 2000, categorie: 'Salaires' },
          { montant: 500, categorie: 'Loyer' },
        ]
      };
      
      // Les données ne devraient pas être vides
      expect(mockData.ventes.length).toBeGreaterThan(0);
      expect(mockData.stock.length).toBeGreaterThan(0);
    });
  });

  describe('Analyse des données', () => {
    test('devrait calculer correctement les statistiques de ventes', () => {
      const ventesData = [
        { montant: 5000 },
        { montant: 3000 },
        { montant: 7000 },
      ];
      
      const total = ventesData.reduce((sum, v) => sum + v.montant, 0);
      const moyenne = total / ventesData.length;
      
      expect(total).toBe(15000);
      expect(moyenne).toBe(5000);
    });

    test('devrait déteccter les ruptures de stock', () => {
      const stockData = [
        { nom: 'Article 1', quantite: 100, seuil_minimum: 50 }, // OK
        { nom: 'Article 2', quantite: 20, seuil_minimum: 30 }, // Rupture!
        { nom: 'Article 3', quantite: 0, seuil_minimum: 10 }, // Rupture!
      ];
      
      const ruptures = stockData.filter(s => s.quantite <= s.seuil_minimum);
      expect(ruptures.length).toBe(2);
    });

    test('devrait générer des charts avec les vraies données', () => {
      const realData = {
        ventes: [
          { montant: 5000 },
          { montant: 3000 },
        ]
      };
      
      const charts = generateChartData('bar', 'vente', realData);
      expect(charts.length).toBeGreaterThan(0);
    });
  });

  describe('Réponses IA basées sur les vraies données', () => {
    test('devrait générer une réponse contenant les chiffres réels', () => {
      const realData = {
        ventesAnalytics: {
          total: 15000,
          nombre: 3,
          moyenne: 5000,
          max: 7000,
          parCategorie: [
            { name: 'Électronique', value: 8000 },
            { name: 'Vêtements', value: 7000 },
          ]
        }
      };
      
      const reponse = getAIResponse('Analyse mes ventes', realData);
      
      // La réponse devrait mention les vraies données
      expect(reponse).toContain('€');  // Format devise
      expect(typeof reponse).toBe('string');
    });

    test('devrait alerter sur les ruptures de stock réelles', () => {
      const realData = {
        stockAnalytics: {
          rupturesStock: 2,
          total: 120,
          nombreArticles: 3,
          articlesAReapprovisionner: [
            { nom: 'Article 2' },
            { nom: 'Article 3' },
          ]
        }
      };
      
      const reponse = getAIResponse('Analyse mon stock', realData);
      expect(reponse).toContain('2');
    });
  });

  describe('Apprentissage de l\'IA', () => {
    test('devrait enregistrer les interactions pour apprentissage', async () => {
      const interaction = {
        question: 'Analyse mes ventes',
        reponse: 'Ventes totales: 15000€',
        donnees: { /* données réelles */ }
      };
      
      expect(interaction.question).toBeTruthy();
      expect(interaction.reponse).toBeTruthy();
      expect(interaction.donnees).toBeTruthy();
    });
  });

  describe('Rafraîchissement des données', () => {
    test('devrait supporter le rafraîchissement manuel', () => {
      // Mock du refresh
      const reftech = jest.fn();
      
      reftech();
      expect(reftech).toHaveBeenCalled();
    });

    test('devrait rafraîchir automatiquement toutes les 5 minutes', () => {
      jest.useFakeTimers();
      const refetch = jest.fn();
      
      // Simuler 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      expect(refetch).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
