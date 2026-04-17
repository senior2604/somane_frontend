// Utilitaires pour générer les données et réponses de l'IA basées sur les données réelles

export const generateChartData = (type, topic, realData = {}) => {
  const charts = [];

  // Données de vente - utilise les vraies données
  if (topic.toLowerCase().includes('vente') || topic.toLowerCase().includes('chiffre')) {
    // Graphe avec vraies données ou données par défaut
    if (realData.ventes && realData.ventes.length > 0) {
      charts.push({
        title: 'Analyse des ventes mensuelles',
        type: 'bar',
        data: realData.ventes.slice(0, 6).map((v, idx) => ({
          name: `Mois ${idx + 1}`,
          'Ventes (€)': v.montant || 0,
          'Target (€)': 50000
        }))
      });

      if (realData.ventesParCategorie && realData.ventesParCategorie.length > 0) {
        charts.push({
          title: 'Répartition par catégorie',
          type: 'pie',
          data: realData.ventesParCategorie
        });
      }
    }
  }

  // Données de stock - utilise les vraies données
  if (topic.toLowerCase().includes('stock') || topic.toLowerCase().includes('inventaire')) {
    if (realData.stock && realData.stock.length > 0) {
      const stockParSemaine = groupStockByWeek(realData.stock);
      charts.push({
        title: 'Évolution du stock',
        type: 'line',
        data: stockParSemaine
      });

      const ruptures = realData.stock.filter(s => (s.quantite || 0) <= (s.seuil_minimum || 0));
      if (ruptures.length > 0) {
        charts.push({
          title: 'Articles en rupture de stock',
          type: 'bar',
          data: ruptures.slice(0, 5).map(r => ({
            name: r.nom || 'Article',
            'Quantité': r.quantite || 0
          }))
        });
      }
    }
  }

  // Données financières - utilise les vraies données
  if (topic.toLowerCase().includes('finance') || topic.toLowerCase().includes('budget') || 
      topic.toLowerCase().includes('compta') || topic.toLowerCase().includes('bilan')) {
    if (realData.finances && realData.finances.length > 0) {
      charts.push({
        title: 'Résultat financier',
        type: 'area',
        data: realData.finances.slice(0, 6).map((f, idx) => ({
          name: `Mois ${idx + 1}`,
          'Revenu': realData.ventes ? realData.ventes[idx]?.montant || 0 : 0,
          'Dépenses': f.montant || 0
        }))
      });

      if (realData.financesParCategorie && realData.financesParCategorie.length > 0) {
        charts.push({
          title: 'Ventilation des dépenses',
          type: 'pie',
          data: realData.financesParCategorie
        });
      }
    }
  }

  // Données de performance / KPIs
  if (topic.toLowerCase().includes('performance') || topic.toLowerCase().includes('kpi')) {
    if (realData.kpis && Object.keys(realData.kpis).length > 0) {
      charts.push({
        title: 'KPI Performance',
        type: 'bar',
        data: Object.entries(realData.kpis).map(([key, value]) => ({
          name: key,
          'Réalisé %': value
        }))
      });
    }
  }

  // Si pas de graphiques spécifiques, retourner un graphe générique
  if (charts.length === 0) {
    charts.push({
      title: 'Analyse générale',
      type: 'line',
      data: [
        { name: 'Semaine 1', 'Valeur': 40 },
        { name: 'Semaine 2', 'Valeur': 50 },
        { name: 'Semaine 3', 'Valeur': 45 },
        { name: 'Semaine 4', 'Valeur': 65 },
        { name: 'Semaine 5', 'Valeur': 75 },
      ]
    });
  }

  return charts;
};

// Fonction pour grouper le stock par semaine
const groupStockByWeek = (stockData) => {
  const weeks = {};
  stockData.forEach(item => {
    const week = Math.ceil(Math.random() * 5); // Simule les semaines
    weeks[`Semaine ${week}`] = (weeks[`Semaine ${week}`] || 0) + (item.quantite || 0);
  });
  return Object.entries(weeks).map(([name, quantity]) => ({
    name,
    'Stock (unités)': quantity,
    'Seuil faible': 500
  }));
};
export const getAIResponse = (message, realData = {}) => {
  const topic = message.toLowerCase();
  const ventesAnalytics = realData.ventesAnalytics;
  const stockAnalytics = realData.stockAnalytics;
  const financesAnalytics = realData.financesAnalytics;

  let response = '';
  
  if (topic.includes('analysé') || topic.includes('analyser') || topic.includes('rapport')) {
    response = `📊 **Analyse basée sur vos données réelles...**\n\n`;
    
    if (topic.includes('vente') && ventesAnalytics) {
      response += `Voici une analyse détaillée de vos ventes :\n\n` +
        `✅ **Statistiques clés :**\n` +
        `• Ventes totales: ${formatCurrency(ventesAnalytics.total)}\n` +
        `• Nombre de transactions: ${ventesAnalytics.nombre}\n` +
        `• Vente moyenne: ${formatCurrency(ventesAnalytics.moyenne)}\n` +
        `• Vente maximale: ${formatCurrency(ventesAnalytics.max)}\n\n` +
        `✅ **Points positifs :**\n` +
        `• Votre portefeuille de clients est actif\n` +
        `• Différentes catégories de produits contribuent au chiffre\n\n` +
        `💡 **Recommandations :**\n` +
        `1. Concentrez-vous sur vos meilleurs clients\n` +
        `2. Analysez où se font les plus grandes ventes\n` +
        `3. Optimisez votre mix produit`;
    } else if (topic.includes('stock') && stockAnalytics) {
      response += `Analyse de votre gestion de stock :\n\n` +
        `✅ **État du stock :**\n` +
        `• Stock total: ${stockAnalytics.total} articles\n` +
        `• Nombre d'articles: ${stockAnalytics.nombreArticles}\n` +
        `• Valeur totale du stock: ${formatCurrency(stockAnalytics.valeurStock)}\n` +
        `• Articles en rupture: ${stockAnalytics.rupturesStock}\n\n` +
        `⚠️ **Alertes :**\n` +
        `${stockAnalytics.rupturesStock > 0 ? `• ${stockAnalytics.rupturesStock} articles sont en dessous du seuil minimum!` : 'Aucune rupture détectée'}\n\n` +
        `💡 **Actions recommandées :**\n` +
        `1. Revoir vos contrats d'approvisionnement\n` +
        `2. Implémenter un système d'alerte automatique\n` +
        `3. Optimiser les délais de réapprovisionnement`;
    } else if ((topic.includes('finance') || topic.includes('budget')) && financesAnalytics) {
      response += `Vue d'ensemble financière basée sur vos données :\n\n` +
        `✅ **Santé financière :**\n` +
        `• Revenu total: ${formatCurrency(financesAnalytics.revenuTotal)}\n` +
        `• Dépenses totales: ${formatCurrency(financesAnalytics.depenses)}\n` +
        `• Bénéfice brut: ${formatCurrency(financesAnalytics.benefice)}\n` +
        `• Marge nette: ${financesAnalytics.margeNet.toFixed(2)}%\n\n` +
        `💰 **Métriques clés :**\n` +
        `• Ratio revenu/dépense: ${(financesAnalytics.revenuTotal / (financesAnalytics.depenses || 1)).toFixed(2)}x\n` +
        `• Efficacité dépenses: ${(100 - financesAnalytics.margeNet).toFixed(2)}%\n\n` +
        `🎯 **Objectifs pour le prochain trimestre :**\n` +
        `1. Augmenter le revenu de 10%\n` +
        `2. Réduire les dépenses de 5 à 10%\n` +
        `3. Améliorer la marge nette`;
    }
  } else if (topic.includes('conseil') || topic.includes('optimiser') || topic.includes('améliorer')) {
    response = `🎯 **Conseils d'optimisation basés sur vos données :**\n\n`;
    if (ventesAnalytics) {
      response += `**Pour vos ventes :**\n` +
        `• Client top: Identifiez et nurturez votre clientèle la plus rentable\n` +
        `• Catégories: Forcez sur les produits/services les plus demandés\n` +
        `• Saisonnalité: Analysez les pics et creux de vos ventes\n\n`;
    }
    if (stockAnalytics) {
      response += `**Pour vos stocks :**\n` +
        `• Articles en rupture: Augmentez les niveaux de stock pour ${stockAnalytics.articlesAReapprovisionner.slice(0, 2).map(a => a.nom).join(', ')}\n` +
        `• Rotation: Dynamisez la vente des articles lents\n` +
        `• Prévisionnel: Anticipez les besoins sur 3 mois\n\n`;
    }
    response += `**Pour vos finances :**\n` +
      `• Suivi hebdomadaire des KPIs\n` +
      `• Budget prévisionnel trimestériel\n` +
      `• Analyse des écarts mensuels`;
  } else if (topic.includes('comment') || topic.includes('quoi') || topic.includes('aide')) {
    response = `👋 **Comment je peux vous aider avec vos vraies données :**\n\n` +
      `Je suis votre IA d'analyse d'entreprise. Je peux :\n\n` +
      `📊 **Analyser vos données:**\n` +
      `• "Analyse mes ventes du mois" → voir vos chiffres réels\n` +
      `• "État de mon stock" → identifier les ruptures\n` +
      `• "Rapport financier" → comprendre votre rentabilité\n\n` +
      `📈 **Générer des insights :**\n` +
      `• Identifier vos meilleurs clients\n` +
      `• Détecter les articles en rupture\n` +
      `• Calculer vos KPIs en temps réel\n\n` +
      `💡 **Proposer des actions :**\n` +
      `• Optimisation des coûts\n` +
      `• Stratégie commerciale\n` +
      `• Gestion du cash-flow`;
  } else {
    response = `✨ **Analyse personnalisée :**\n\n` +
      `J'ai accès à toutes vos données (ventes, stock, finances). Je peux vous aider à :\n\n` +
      `• Analyser vos tendances réelles\n` +
      `• Générer des rapports automatiques\n` +
      `• Identifier les opportunités d'optimisation\n` +
      `• Anticiper les problèmes\n\n` +
      `📌 **Quelle est votre priorité du jour ?**`;
  }

  return response;
};

// Fonction utilitaire pour formater les montants
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

export const generateStreamingResponse = (message) => {
  // Simule une réponse en temps réel
  const fullResponse = getAIResponse(message);
  return fullResponse;
};
