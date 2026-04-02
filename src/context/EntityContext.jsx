// src/contexts/EntityContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const EntityContext = createContext();

export const useEntity = () => {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
};

export const EntityProvider = ({ children }) => {
  const [activeEntity, setActiveEntity] = useState(null);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('currentEntite');
    if (saved) {
      try {
        setActiveEntity(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur chargement entité:', e);
      }
    }
  }, []);

  // Fonction pour changer d'entité
  const selectEntity = (entity) => {
    setActiveEntity(entity);
    localStorage.setItem('currentEntite', JSON.stringify(entity));
    
    // Mettre à jour aussi l'utilisateur
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user) {
      user.company_id = entity.id;
      user.entite_active = entity.id;
      localStorage.setItem('user', JSON.stringify(user));
    }
  };

  return (
    <EntityContext.Provider value={{ activeEntity, selectEntity }}>
      {children}
    </EntityContext.Provider>
  );
};