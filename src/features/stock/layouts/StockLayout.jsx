import React from 'react';
import { Outlet } from 'react-router-dom';
import StockHeader from '../components/StockHeader';
import ApplicationLayout from '../../../components/ApplicationLayout';

const StockLayout = () => {
  return (
    <ApplicationLayout header={<StockHeader />} contentClassName="somane-app-shell__main--padded">
      <Outlet />
    </ApplicationLayout>
  );
};

export default StockLayout;
