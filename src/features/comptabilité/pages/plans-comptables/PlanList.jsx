// C:\python\django\somane_frontend\src\features\comptabilité\pages\plans comptables\PlanList.jsx

import React, { useEffect } from 'react';
import { Table, Button, Space, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import useComptaStore from '../../../../stores/comptaStore';  // ← monte de 5 dossiers (features → src → stores)

const PlanList = () => {
  const navigate = useNavigate();
  const { frameworks, fetchFrameworks, loading } = useComptaStore();

  useEffect(() => {
    fetchFrameworks(); // à implémenter dans le store
  }, []);

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    {
      title: 'Partagé',
      key: 'shared',
      render: (_, record) => (
        record.company?.length === 0 ? (
          <Tag color="green">Tous</Tag>
        ) : (
          <Tag color="blue">{record.company.length} entité(s)</Tag>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button onClick={() => navigate(`/compta/plans/${record.id}`)}>Détail</Button>
          <Button onClick={() => navigate(`/compta/plans/${record.id}/edit`)}>Modifier</Button>
        </Space>
      )
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => navigate('/comptabilite/plans/new')}>
          Nouveau plan comptable
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={frameworks}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default PlanList;