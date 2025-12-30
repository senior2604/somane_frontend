// features/comptabilité/pages/Journaux/Index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { journauxService, apiClient } from "../../services";
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function JournauxPage() {
  const navigate = useNavigate();
  
  const [journaux, setJournaux] = useState([]);
  const [filteredJournaux, setFilteredJournaux] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [journauxRes, typesRes] = await Promise.all([
        journauxService.getAll(),
        journauxService.getTypes()
      ]);

      setJournaux(Array.isArray(journauxRes) ? journauxRes : []);
      setFilteredJournaux(Array.isArray(journauxRes) ? journauxRes : []);
      setJournalTypes(Array.isArray(typesRes) ? typesRes : []);
      
      // Charger les entreprises
      try {
        const companiesRes = await apiClient.get('entites/');
        setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
      } catch (err) {
        console.log('Erreur chargement entreprises:', err);
        setCompanies([]);
      }

    } catch (err) {
      console.error('Erreur chargement journaux:', err);
      setError(err.message || 'Erreur de chargement des données');
      setJournaux([]);
      setFilteredJournaux([]);
      setJournalTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Configuration des colonnes
  const columns = [
    { 
      id: 'code', 
      label: 'Code',
      field: 'code',
      width: '100px'
    },
    { 
      id: 'nom', 
      label: 'Nom',
      field: 'name'
    },
    { 
      id: 'type', 
      label: 'Type',
      render: (journal) => (
        <div className="text-sm text-gray-700">
          {journal.type?.name || journal.type_name || 'Non défini'}
        </div>
      )
    },
    { 
      id: 'entreprise', 
      label: 'Entreprise',
      render: (journal) => (
        <div className="text-sm text-gray-900">
          {journal.company?.raison_sociale || journal.company?.nom || 'Toutes'}
        </div>
      )
    },
    { 
      id: 'compte', 
      label: 'Compte',
      render: (journal) => (
        journal.default_account ? (
          <div className="flex items-center gap-1">
            <span className="font-mono text-violet-600 font-medium text-sm">
              {journal.default_account.code || '---'}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 italic text-sm">Non défini</span>
        )
      )
    },
    { 
      id: 'statut', 
      label: 'Statut',
      render: (journal) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          journal.active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {journal.active ? 'Actif' : 'Inactif'}
        </span>
      )
    },
    { 
      id: 'actions', 
      label: 'Actions',
      type: 'actions'
    }
  ];

  // Configuration des filtres
  const filterConfigs = [
    ...(companies.length > 0 ? [{
      id: 'company',
      label: 'Entreprise',
      type: 'select',
      options: companies.map(c => ({
        value: c.id,
        label: c.raison_sociale || c.nom || `Entreprise ${c.id}`
      })),
      placeholder: 'Toutes entreprises'
    }] : []),
    ...(journalTypes.length > 0 ? [{
      id: 'type',
      label: 'Type de journal',
      type: 'select',
      options: journalTypes.map(t => ({
        value: t.id,
        label: `${t.code || ''} - ${t.name || 'Sans nom'}`
      })),
      placeholder: 'Tous types'
    }] : []),
    {
      id: 'active',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'true', label: 'Actifs' },
        { value: 'false', label: 'Inactifs' }
      ],
      placeholder: 'Tous'
    }
  ];

  // Gestion de la recherche
  const handleSearch = (term) => {
    setSearchTerm(term);
    applyFilters(term, activeFilters);
  };

  // Gestion des filtres
  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    applyFilters(searchTerm, filters);
  };

  // Appliquer recherche et filtres
  const applyFilters = (searchTerm, filters) => {
    let filtered = [...journaux];
    
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(journal =>
        (journal.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (journal.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (journal.type?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (journal.company?.raison_sociale || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filters.forEach(filter => {
      if (filter.id === 'company' && filter.value) {
        filtered = filtered.filter(journal => 
          journal.company?.id?.toString() === filter.value.toString()
        );
      } else if (filter.id === 'type' && filter.value) {
        filtered = filtered.filter(journal => 
          journal.type?.id?.toString() === filter.value.toString()
        );
      } else if (filter.id === 'active' && filter.value) {
        const isActive = filter.value === 'true';
        filtered = filtered.filter(journal => journal.active === isActive);
      }
    });
    
    setFilteredJournaux(filtered);
  };

  // Fonction pour exporter en Excel
  const exportToExcel = (data) => {
    try {
      // Importer dynamiquement xlsx
      import('xlsx').then((XLSX) => {
        // Préparer les données
        const excelData = data.map(journal => ({
          Code: journal.code || '',
          Nom: journal.name || '',
          Type: journal.type?.name || journal.type_name || '',
          Entreprise: journal.company?.raison_sociale || journal.company?.nom || '',
          'Compte par défaut': journal.default_account?.code || '',
          Statut: journal.active ? 'Actif' : 'Inactif',
          'Date création': journal.created_at ? new Date(journal.created_at).toLocaleDateString() : '',
          'Dernière modification': journal.updated_at ? new Date(journal.updated_at).toLocaleDateString() : ''
        }));
        
        // Créer le workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Définir les largeurs de colonnes
        const colWidths = [
          { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
          { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
        ];
        worksheet['!cols'] = colWidths;
        
        // Ajouter la feuille
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Journaux Comptables');
        
        // Générer et télécharger le fichier
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `journaux_comptables_${date}.xlsx`);
        
        console.log(`Export Excel réussi: ${data.length} journaux`);
      }).catch(error => {
        console.error('Erreur lors du chargement de xlsx:', error);
        alert('Erreur lors de l\'export Excel. Vérifiez que la bibliothèque xlsx est installée.');
      });
    } catch (error) {
      console.error('Erreur export Excel:', error);
      alert('Erreur lors de l\'export Excel: ' + error.message);
    }
  };

  // Fonction pour exporter en PDF
  const exportToPDF = (data) => {
    try {
      // Importer dynamiquement jsPDF et autoTable
      Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]).then(([jsPDFModule]) => {
        const { jsPDF } = jsPDFModule;
        const doc = new jsPDF('p', 'mm', 'a4');
        const date = new Date().toLocaleDateString();
        
        // Titre
        doc.setFontSize(16);
        doc.text('Liste des journaux comptables', 20, 20);
        
        // Informations
        doc.setFontSize(10);
        doc.text(`Export du: ${date}`, 20, 28);
        doc.text(`Total: ${data.length} journaux`, 20, 35);
        
        // Préparer les données pour le tableau
        const tableData = data.map(journal => [
          journal.code || '',
          journal.name || '',
          journal.type?.name || journal.type_name || '',
          journal.company?.raison_sociale || journal.company?.nom || '',
          journal.default_account?.code || '',
          journal.active ? 'Actif' : 'Inactif'
        ]);
        
        // Générer le tableau
        doc.autoTable({
          startY: 40,
          head: [['Code', 'Nom', 'Type', 'Entreprise', 'Compte', 'Statut']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [103, 58, 183],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 45 },
            4: { cellWidth: 25 },
            5: { cellWidth: 20 }
          },
          margin: { left: 14, right: 14 }
        });
        
        // Télécharger le PDF
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`journaux_comptables_${dateStr}.pdf`);
        
        console.log(`Export PDF réussi: ${data.length} journaux`);
      }).catch(error => {
        console.error('Erreur lors du chargement des bibliothèques PDF:', error);
        alert('Erreur lors de l\'export PDF. Vérifiez que les bibliothèques jspdf et jspdf-autotable sont installées.');
      });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF: ' + error.message);
    }
  };

  // Export des données
  const handleExport = (format) => {
    // Utiliser les données filtrées si disponibles, sinon toutes les données
    const dataToExport = filteredJournaux.length > 0 ? filteredJournaux : journaux;
    
    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    console.log(`Export des journaux en ${format}: ${dataToExport.length} éléments`);
    
    if (format === 'pdf') {
      exportToPDF(dataToExport);
    } else if (format === 'excel') {
      exportToExcel(dataToExport);
    }
  };

  // Gestion des actions sur les lignes
  const handleView = (journal) => {
    navigate(`/comptabilite/journaux/${journal.id}`);
  };

  const handleEdit = (journal) => {
    navigate(`/comptabilite/journaux/${journal.id}/edit`);
  };

  const handleDelete = async (journal) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le journal "${journal.name}" ?`)) {
      try {
        await journauxService.delete(journal.id);
        loadData();
      } catch (err) {
        console.error('Erreur suppression journal:', err);
        setError('Erreur lors de la suppression');
      }
    }
  };

  // Empty state personnalisé
  const emptyState = journaux.length === 0 ? {
    title: 'Aucun journal disponible',
    description: 'Commencez par créer votre premier journal comptable',
    action: {
      label: 'Créer un journal',
      onClick: () => navigate('/comptabilite/journaux/create')
    }
  } : null;

  return (
    <ComptabiliteTableContainer
      // Données
      data={filteredJournaux}
      loading={loading}
      error={error}
      
      // Configuration
      title="Journaux Comptables"
      moduleType="journaux"
      
      // Colonnes
      columns={columns}
      defaultVisibleColumns={['code', 'nom', 'type', 'entreprise', 'statut', 'actions']}
      
      // Filtres
      filterConfigs={filterConfigs}
      onFilterChange={handleFilterChange}
      
      // Actions
      onRefresh={loadData}
      onExport={handleExport}
      onCreate={() => navigate('/comptabilite/journaux/create')}
      onSearch={handleSearch}
      
      // Pagination
      itemsPerPage={10}
      
      // Actions sur les lignes
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRowClick={handleView}
      
      // Personnalisation
      emptyState={emptyState}
    />
  );
}