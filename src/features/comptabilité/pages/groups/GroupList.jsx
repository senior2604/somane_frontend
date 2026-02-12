// src/features/comptabilite/pages/groups/GroupList.jsx
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
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../../../../stores/comptabilite/groupStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Title, Text } = Typography;
const { confirm } = Modal;
const { Option } = Select;

const GroupList = () => {
  const navigate = useNavigate();
  const { groups, loading, error, fetchGroups, deleteGroup, setFilters } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const [selectedFramework, setSelectedFramework] = useState(null);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      fetchGroups({ framework: selectedFramework });
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
      content: `Êtes-vous sûr de vouloir supprimer la classe "${record.name}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteGroup(record.id);
          message.success('Classe supprimée avec succès');
          if (selectedFramework) {
            fetchGroups({ framework: selectedFramework });
          }
        } catch (err) {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text, record) => (
        <Space>
          {record.is_leaf ? <FolderOutlined /> : <FolderOpenOutlined />}
          <strong style={{ color: '#1890ff' }}>{text}</strong>
        </Space>
      ),
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
      title: 'Plage de comptes',
      key: 'range',
      width: 200,
      render: (_, record) => {
        if (record.code_prefix_start && record.code_prefix_end) {
          return (
            <Tag color="blue">
              {record.code_prefix_start} → {record.code_prefix_end}
            </Tag>
          );
        }
        if (record.code_prefix_start) {
          return <Tag color="cyan">Commence par {record.code_prefix_start}</Tag>;
        }
        return <Text type="secondary">Non défini</Text>;
      },
    },
    {
      title: 'Sous-classes',
      key: 'children',
      width: 120,
      render: (_, record) => (
        <Tag color={record.children?.length > 0 ? 'green' : 'default'}>
          {record.children?.length || 0}
        </Tag>
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
              onClick={() => navigate(`/comptabilite/groups/${record.id}/edit`)}
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
              Classes / Groupes de comptes
            </Title>
            <Text type="secondary">
              Gérez les classes et groupes de comptes de vos plans comptables
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/comptabilite/groups/new')}
            disabled={!selectedFramework}
          >
            Nouvelle classe
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
            <FolderOpenOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>
              <Text type="secondary">
                Veuillez sélectionner un référentiel comptable pour voir ses classes
              </Text>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={groups}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showTotal: (total) => `Total: ${total} classe(s)`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default GroupList;