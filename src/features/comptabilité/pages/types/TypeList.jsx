// src/features/comptabilite/pages/types/TypeList.jsx
import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  message,
  Modal,
  Typography,
  Select,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useTypeStore from '../../../../stores/comptabilite/typeStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Title, Text } = Typography;
const { confirm } = Modal;
const { Option } = Select;

const TypeList = () => {
  const navigate = useNavigate();
  const { types, loading, error, fetchTypes, deleteType } = useTypeStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const [selectedFramework, setSelectedFramework] = useState(null);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      fetchTypes({ framework: selectedFramework });
    }
  }, [selectedFramework]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleDelete = (record) => {
    confirm({
      title: 'Confirmer la suppression',
      content: `Êtes-vous sûr de vouloir supprimer la nature "${record.name}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteType(record.id);
          message.success('Nature supprimée avec succès');
          if (selectedFramework) {
            fetchTypes({ framework: selectedFramework });
          }
        } catch (err) {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const getInternalGroupColor = (group) => {
    const colors = {
      asset: 'blue',
      liability: 'red',
      equity: 'purple',
      income: 'green',
      expense: 'orange',
    };
    return colors[group] || 'default';
  };

  const getInternalGroupLabel = (group) => {
    const labels = {
      asset: 'Actif',
      liability: 'Passif',
      equity: 'Capitaux propres',
      income: 'Produits',
      expense: 'Charges',
    };
    return labels[group] || group;
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text) => <strong style={{ color: '#1890ff' }}>{text}</strong>,
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Référentiel',
      dataIndex: 'framework_name',
      key: 'framework_name',
      width: 200,
    },
    {
      title: 'Groupe interne',
      dataIndex: 'internal_group',
      key: 'internal_group',
      width: 150,
      render: (group) => (
        <Tag color={getInternalGroupColor(group)}>{getInternalGroupLabel(group)}</Tag>
      ),
    },
    {
      title: 'Solde par défaut',
      key: 'default_balance',
      width: 150,
      render: (_, record) => {
        if (record.default_debit && record.default_credit) {
          return <Tag>Les deux</Tag>;
        }
        if (record.default_debit) {
          return <Tag color="blue">Débiteur</Tag>;
        }
        if (record.default_credit) {
          return <Tag color="green">Créditeur</Tag>;
        }
        return <Text type="secondary">Non défini</Text>;
      },
    },
    {
      title: 'Lettrage',
      dataIndex: 'allow_reconciliation',
      key: 'allow_reconciliation',
      width: 100,
      render: (allow) =>
        allow ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 18 }} />
        ),
    },
    {
      title: 'Statut',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>{active ? 'Actif' : 'Inactif'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/comptabilite/types/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}
      >
        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Natures de comptes
            </Title>
            <Text type="secondary">
              Gérez les types/natures de comptes (Immobilisation, Tiers, Banque, etc.)
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/comptabilite/types/new')}
            disabled={!selectedFramework}
          >
            Nouvelle nature
          </Button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Space size="large">
            <div>
              <Text strong>Référentiel comptable:</Text>
              <Select
                style={{ width: 300, marginLeft: 12 }}
                size="large"
                placeholder="Sélectionnez un plan comptable"
                onChange={(value) => setSelectedFramework(value)}
                value={selectedFramework}
                allowClear
              >
                {frameworks.map((fw) => (
                  <Option key={fw.id} value={fw.id}>
                    {fw.code} - {fw.name}
                  </Option>
                ))}
              </Select>
            </div>
          </Space>
        </div>

        {!selectedFramework ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: '#8c8c8c',
            }}
          >
            <TagsOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>
              <Text type="secondary">
                Veuillez sélectionner un référentiel comptable pour voir ses natures
              </Text>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={types}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showTotal: (total) => `Total: ${total} nature(s)`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default TypeList;