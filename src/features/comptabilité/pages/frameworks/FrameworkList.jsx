// src/features/comptabilite/pages/frameworks/FrameworkList.jsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Input, Card, message, Modal, Typography } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Title } = Typography;
const { confirm } = Modal;

const FrameworkList = () => {
  const navigate = useNavigate();
  const { frameworks, loading, error, fetchFrameworks, deleteFramework, pagination } = useFrameworkStore();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleDelete = (record) => {
    confirm({
      title: 'Confirmer la suppression',
      content: `Êtes-vous sûr de vouloir supprimer le plan comptable "${record.name}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteFramework(record.id);
          message.success('Plan comptable supprimé avec succès');
        } catch (err) {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchFrameworks({ search: value });
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: true,
      render: (text) => <strong style={{ color: '#1890ff' }}>{text}</strong>,
    },
    {
      title: 'Nom du plan',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Pays',
      dataIndex: ['country', 'nom'],
      key: 'country',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Portée',
      key: 'shared',
      width: 150,
      render: (_, record) => {
        const isShared = !record.company || record.company.length === 0;
        return isShared ? (
          <Tag color="green" icon={<i className="fas fa-globe" />}>
            Toutes les entités
          </Tag>
        ) : (
          <Tag color="blue" icon={<i className="fas fa-building" />}>
            {record.company.length} entité{record.company.length > 1 ? 's' : ''}
          </Tag>
        );
      },
    },
    {
      title: 'État',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/comptabilite/frameworks/${record.id}`)}
          >
            Voir
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/comptabilite/frameworks/${record.id}/edit`)}
          >
            Modifier
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Supprimer
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        bordered={false}
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        }}
      >
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Plans Comptables
            </Title>
            <p style={{ color: '#8c8c8c', marginTop: '8px' }}>
              Gérez vos référentiels comptables (SYSCOHADA, PCG, IFRS, etc.)
            </p>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/comptabilite/frameworks/new')}
          >
            Nouveau plan comptable
          </Button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Rechercher par code ou nom..."
            prefix={<SearchOutlined />}
            size="large"
            allowClear
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: '400px' }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={frameworks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} plan(s) comptable(s)`,
          }}
          onChange={(pagination, filters, sorter) => {
            fetchFrameworks({
              page: pagination.current,
              page_size: pagination.pageSize,
              ordering: sorter.field ? `${sorter.order === 'descend' ? '-' : ''}${sorter.field}` : undefined,
            });
          }}
        />
      </Card>
    </div>
  );
};

export default FrameworkList;