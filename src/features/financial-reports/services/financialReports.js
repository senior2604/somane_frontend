// src/features/financial-reports/services/financialReports.js

const API_BASE = '/api/financial-reports/financial-reports';

export const getAllReports = async () => {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Erreur chargement rapports');
  return res.json();
};

export const getReportById = async (id) => {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Erreur chargement rapport');
  return res.json();
};