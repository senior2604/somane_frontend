import { useState, useEffect, useCallback } from 'react';
import {
  fetchVentesData,
  fetchFinancesData,
  fetchClientsData,
  fetchFournisseursData,
  fetchCommandesData,
  fetchKPIsData,
  fetchAIAnalytics
} from './apiService';

// Hook personnalisé pour gérer les données de l'IA
export const useAIData = () => {
  const [data, setData] = useState({
    ventes: [],
    finances: [],
    clients: [],
    fournisseurs: [],
    commandes: [],
    kpis: {},
    analytics: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        ventesData,
        financesData,
        clientsData,
        fournisseursData,
        commandesData,
        kpisData,
        analyticsData
      ] = await Promise.all([
        fetchVentesData(),
        fetchFinancesData(),
        fetchClientsData(),
        fetchFournisseursData(),
        fetchCommandesData(),
        fetchKPIsData(),
        fetchAIAnalytics()
      ]);

      setData({
        ventes: ventesData || [],
        finances: financesData || [],
        clients: clientsData || [],
        fournisseurs: fournisseursData || [],
        commandes: commandesData || [],
        kpis: kpisData || {},
        analytics: analyticsData || [],
      });
    } catch (err) {
      setError(err.message);
      console.error('Erreur chargement données IA:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les données au montage du composant
  useEffect(() => {
    loadAllData();
    // Rafraîchir les données toutes les 5 minutes
    const interval = setInterval(loadAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  return { data, loading, error, refetch: loadAllData };
};

// Hook pour analyser les données de ventes
export const useVentesAnalytics = (ventesData) => {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!ventesData || ventesData.length === 0) return;

    const analysis = {
      total: ventesData.reduce((sum, v) => sum + (v.montant || 0), 0),
      moyenne: ventesData.reduce((sum, v) => sum + (v.montant || 0), 0) / ventesData.length,
      max: Math.max(...ventesData.map(v => v.montant || 0)),
      min: Math.min(...ventesData.map(v => v.montant || 0)),
      nombre: ventesData.length,
      parMois: groupByMonth(ventesData),
      parCategorie: groupByCategorie(ventesData),
      parClient: groupByClient(ventesData),
    };
    setAnalytics(analysis);
  }, [ventesData]);

  return analytics;
};

// Hook pour analyser les données de stock (module supprimé)
// export const useStockAnalytics = (stockData) => { ... };

// Hook pour analyser les données financières
export const useFinancesAnalytics = (financesData, ventesData) => {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const analysis = {
      revenuTotal: ventesData ? ventesData.reduce((sum, v) => sum + (v.montant || 0), 0) : 0,
      depenses: financesData ? financesData.reduce((sum, f) => sum + (f.montant || 0), 0) : 0,
      benefice: (ventesData ? ventesData.reduce((sum, v) => sum + (v.montant || 0), 0) : 0) -
        (financesData ? financesData.reduce((sum, f) => sum + (f.montant || 0), 0) : 0),
      margeNet: ((ventesData ? ventesData.reduce((sum, v) => sum + (v.montant || 0), 0) : 0) -
        (financesData ? financesData.reduce((sum, f) => sum + (f.montant || 0), 0) : 0)) /
        (ventesData ? ventesData.reduce((sum, v) => sum + (v.montant || 0), 0) : 1) * 100,
      parCategorie: groupFinancesByCategorie(financesData),
    };
    setAnalytics(analysis);
  }, [financesData, ventesData]);

  return analytics;
};

// Fonctions utilitaires
const groupByMonth = (data) => {
  const grouped = {};
  data.forEach(item => {
    const month = new Date(item.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    grouped[month] = (grouped[month] || 0) + (item.montant || 0);
  });
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
};

const groupByCategorie = (data) => {
  const grouped = {};
  data.forEach(item => {
    const cat = item.categorie || 'Autres';
    grouped[cat] = (grouped[cat] || 0) + (item.montant || 0);
  });
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
};

const groupByClient = (data) => {
  const grouped = {};
  data.forEach(item => {
    const client = item.client_nom || 'Anonyme';
    grouped[client] = (grouped[client] || 0) + (item.montant || 0);
  });
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
};

const groupFinancesByCategorie = (data) => {
  const grouped = {};
  if (!data) return [];
  data.forEach(item => {
    const cat = item.categorie || 'Autres';
    grouped[cat] = (grouped[cat] || 0) + (item.montant || 0);
  });
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
};

// Fonctions utilitaires (module stock supprimé)
// const calculateRotation = (stockData) => { ... };
