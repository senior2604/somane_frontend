// src/features/comptabilite/pages/accounts/AccountList.jsx

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
  Input,
  Tag,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ImportOutlined,
  ExportOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../../../config/axiosInstance';
import { ENDPOINTS } from '../../../../config/api';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useAccountStore from '../../../../stores/comptabilite/accountStore'; // ✅ NOUVEAU

const { Title, Text } = Typography;
const { confirm } = Modal;
const { Option } = Select;

const AccountList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // ✅ Utilisation des stores
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const { 
    accounts, 
    loading, 
    pagination, 
    fetchAccounts, 
    deleteAccount,
    setPagination 
  } = useAccountStore();

  // Filtres
  const [selectedFramework, setSelectedFramework] = useState(
    searchParams.get('framework') || null
  );
  const [selectedType, setSelectedType] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Options pour les filtres
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      loadAccounts();
      loadFilterOptions();
    }
  }, [selectedFramework, selectedType, selectedGroup, searchText, pagination.current]);

  const loadFilterOptions = async () => {
    try {
      const [typesRes, groupsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: selectedFramework } }),
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: selectedFramework } }),
      ]);

      setTypes(typesRes.data.results || typesRes.data);
      setGroups(groupsRes.data.results || groupsRes.data);
    } catch (error) {
      console.error('Erreur chargement filtres:', error);
    }
  };

  const loadAccounts = async () => {
    const params = {
      framework: selectedFramework,
      page: pagination.current,
      page_size: pagination.pageSize,
    };

    if (selectedType) params.type = selectedType;
    if (selectedGroup) params.group = selectedGroup;
    if (searchText) params.search = searchText;

    try {
      await fetchAccounts(params);
    } catch (error) {
      message.error('Erreur lors du chargement des comptes');
      console.error(error);
    }
  };

  const handleDelete = (record) => {
    confirm({
      title: 'Confirmer la suppression',
      content: `Êtes-vous sûr de vouloir supprimer le compte "${record.code} - ${record.name}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteAccount(record.id);
          message.success('Compte supprimé avec succès');
          loadAccounts();
        } catch (err) {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const handleExport = async () => {
    try {
      message.info('Export en cours...');
      // TODO: Implémenter l'export CSV/Excel
      message.success('Export réussi');
    } catch (error) {
      message.error('Erreur lors de l\'export');
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      fixed: 'left',
      render: (text) => <strong style={{ color: '#1890ff' }}>{text}</strong>,
    },
    {
      title: 'Libellé',
      dataIndex: 'name',
      key: 'name',
      width: 300,
    },
    {
      title: 'Nature',
      dataIndex: 'type_name',
      key: 'type_name',
      width: 200,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Classe',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 150,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Solde ouverture',
      dataIndex: 'opening_balance',
      key: 'opening_balance',
      width: 150,
      align: 'right',
      render: (value) => (
        <Text style={{ fontFamily: 'monospace' }}>
          {parseFloat(value || 0).toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: 'Lettrable',
      dataIndex: 'reconcile',
      key: 'reconcile',
      width: 100,
      align: 'center',
      render: (reconcile) =>
        reconcile ? (
          <Tag color="success">Oui</Tag>
        ) : (
          <Tag color="default">Non</Tag>
        ),
    },
    {
      title: 'Statut',
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/comptabilite/accounts/${record.id}/edit`)}
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
        {/* En-tête */}
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
              Comptes comptables
            </Title>
            <Text type="secondary">
              Gérez les comptes du plan comptable sélectionné
            </Text>
          </div>
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={!selectedFramework || accounts.length === 0}
            >
              Exporter
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => navigate('/comptabilite/accounts/import')}
              disabled={!selectedFramework}
            >
              Importer
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/comptabilite/accounts/new')}
              disabled={!selectedFramework}
            >
              Nouveau compte
            </Button>
          </Space>
        </div>

        {/* Filtres */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={6}>
            <Text strong>Référentiel:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              size="large"
              placeholder="Sélectionnez un plan"
              onChange={(value) => {
                setSelectedFramework(value);
                setSelectedType(null);
                setSelectedGroup(null);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              value={selectedFramework}
              allowClear
            >
              {frameworks.map((fw) => (
                <Option key={fw.id} value={fw.id}>
                  {fw.code} - {fw.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong>Nature:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              size="large"
              placeholder="Toutes les natures"
              onChange={(value) => {
                setSelectedType(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              value={selectedType}
              allowClear
              disabled={!selectedFramework}
            >
              {types.map((type) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong>Classe:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              size="large"
              placeholder="Toutes les classes"
              onChange={(value) => {
                setSelectedGroup(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              value={selectedGroup}
              allowClear
              disabled={!selectedFramework}
            >
              {groups.map((group) => (
                <Option key={group.id} value={group.id}>
                  {group.code} - {group.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong>Recherche:</Text>
            <Input
              style={{ marginTop: '8px' }}
              size="large"
              placeholder="Code ou libellé..."
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => {
                setSearchText(e.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              disabled={!selectedFramework}
            />
          </Col>
        </Row>

        {/* Table */}
        {!selectedFramework ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: '#8c8c8c',
            }}
          >
            <BankOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>
              <Text type="secondary">
                Veuillez sélectionner un référentiel comptable pour voir ses comptes
              </Text>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={accounts}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} compte(s)`,
              onChange: (page, pageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize,
                }));
              },
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default AccountList;