// src/features/comptabilité/pages/accounts/AccountList.jsx
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  ImportOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useAccountStore from '../../../../stores/comptabilite/accountStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Title, Text } = Typography;
const { confirm } = Modal;

const FRAMEWORK_SESSION_KEY = 'account_list_selected_framework';

const AccountList = () => {
  const navigate = useNavigate();

  const { frameworks, fetchFrameworks }                             = useFrameworkStore();
  const { accounts, loading, pagination, fetchAccounts, deleteAccount, setPagination } = useAccountStore();

  const [selectedFramework, setSelectedFramework] = useState(() => {
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const [selectedType,  setSelectedType]  = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchText,    setSearchText]    = useState('');
  const [types,  setTypes]  = useState([]);
  const [groups, setGroups] = useState([]);

  // ── Chargement initial ──────────────────────────────────────────────
  // useEffect(() => { fetchFrameworks(); }, [fetchFrameworks]);

  const loadFilterOptions = useCallback(async (fwId) => {
    try {
      const [typesRes, groupsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES,  { params: { framework: fwId, page_size: 200 } }),
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: fwId, page_size: 200 } }),
      ]);
      setTypes(typesRes.data.results   || typesRes.data);
      setGroups(groupsRes.data.results || groupsRes.data);
    } catch { console.error('Erreur chargement filtres'); }
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!selectedFramework) return;
    const params = {
      framework:  selectedFramework,
      page:       pagination.current,
      page_size:  pagination.pageSize,
    };
    if (selectedType)  params.type   = selectedType;
    if (selectedGroup) params.group  = selectedGroup;
    if (searchText)    params.search = searchText;
    try {
      await fetchAccounts(params);
    } catch { message.error('Erreur lors du chargement des comptes'); }
  }, [selectedFramework, selectedType, selectedGroup, searchText, pagination.current, pagination.pageSize, fetchAccounts]);


// ✅ Effet 3 : comptes — se déclenche sur les vrais changements de filtre
// ── Remplacer les useEffect existants par ceux-ci ──────────────────

// Effet 1 : chargement initial des référentiels
useEffect(() => { 
  fetchFrameworks(); 
}, []);

// Effet 2 : quand le framework change → charger filtres ET reset
useEffect(() => {
  if (!selectedFramework) {
    setTypes([]);
    setGroups([]);
    return;
  }
  loadFilterOptions(selectedFramework);  // ← C'était manquant !
}, [selectedFramework]);

// Effet 3 : charger les comptes selon tous les filtres actifs
useEffect(() => {
  if (!selectedFramework) return;

  const params = {
    framework: selectedFramework,
    page:      pagination.current,
    page_size: pagination.pageSize,
  };
  if (selectedType)  params.type   = selectedType;
  if (selectedGroup) params.group  = selectedGroup;
  if (searchText)    params.search = searchText;

  fetchAccounts(params).catch(() =>
    message.error('Erreur lors du chargement des comptes')
  );
}, [selectedFramework, selectedType, selectedGroup, searchText, pagination.current, pagination.pageSize]);

// ← fetchAccounts PAS dans les deps (stable via zustand), loadAccounts supprimé

  // ── Handlers ───────────────────────────────────────────────────────
  const handleFrameworkChange = (value) => {
    setSelectedFramework(value ?? null);
    setSelectedType(null);
    setSelectedGroup(null);
    setTypes([]);    // ← reset les options
    setGroups([]);   // ← reset les options
    setPagination((prev) => ({ ...prev, current: 1 }));
    if (value) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(value));
    else        sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  };

  const handleNew    = () => navigate('/comptabilite/accounts/new',           { state: { frameworkId: selectedFramework } });
  const handleView   = (r) => navigate(`/comptabilite/accounts/${r.id}`);
  const handleEdit   = (r) => navigate(`/comptabilite/accounts/${r.id}/edit`, { state: { frameworkId: selectedFramework } });
  const handleImport = ()  => navigate('/comptabilite/accounts/import',       { state: { frameworkId: selectedFramework } });

  const handleExport = () => {
    try {
      const { exportAccountsToCSV } = useAccountStore.getState();
      const csv     = exportAccountsToCSV();
      const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url     = URL.createObjectURL(blob);
      const link    = document.createElement('a');
      link.href     = url;
      link.download = `comptes_${selectedFramework}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('Export CSV réussi');
    } catch (e) { message.error(e.message || "Erreur lors de l'export"); }
  };

  const handleDelete = (record) => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer le compte <strong>{record.code} – {record.name}</strong> ?<br />
          <Text type="danger" style={{ fontSize: 12 }}>Cette action est irréversible.</Text>
        </span>
      ),
      okText: 'Supprimer', okType: 'danger', cancelText: 'Annuler',
        onOk: async () => {
      try {
        await deleteAccount(record.id);
        message.success('Compte supprimé avec succès');
        // ✅ Recharger directement sans passer par loadAccounts
        fetchAccounts({ 
          framework: selectedFramework, 
          page: pagination.current,
          page_size: pagination.pageSize 
        });
      } catch { 
        message.error('Erreur lors de la suppression');  }
      },
    });
  };

  const selectedFw = frameworks.find((f) => f.id === selectedFramework);

  // ── Colonnes ───────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Code', dataIndex: 'code', key: 'code', width: 120, fixed: 'left',
      sorter: (a, b) => a.code.localeCompare(b.code),
      render: (text) => (
        <Text strong style={{ color: '#1677ff', fontFamily: 'monospace' }}>{text}</Text>
      ),
    },
    { title: 'Libellé', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: 'Nature', dataIndex: 'type_name', key: 'type_name', width: 180,
      render: (text) => text ? <Tag color="blue">{text}</Tag> : <Text type="secondary">–</Text>,
    },
    {
      title: 'Classe', dataIndex: 'group_name', key: 'group_name', width: 150,
      render: (text) => text || <Text type="secondary">–</Text>,
    },
    {
      title: 'Lettrable', dataIndex: 'reconcile', key: 'reconcile', width: 100, align: 'center',
      render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Oui' : 'Non'}</Tag>,
    },
    {
      title: 'Statut', dataIndex: 'active', key: 'active', width: 90,
      render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Actif' : 'Inactif'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 120, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="Voir le détail">
            <Button type="text" icon={<EyeOutlined />}    onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button type="text" icon={<EditOutlined />}   onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8 }}>

        {/* En-tête */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Comptes comptables</Title>
            <Text type="secondary">Gérez les comptes du plan comptable sélectionné</Text>
          </div>
          <Space wrap>
            <Button icon={<ExportOutlined />} onClick={handleExport}  disabled={!selectedFramework || accounts.length === 0}>
              Exporter
            </Button>
            <Button icon={<ImportOutlined />} onClick={handleImport}  disabled={!selectedFramework}>
              Importer
            </Button>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleNew} disabled={!selectedFramework}>
              Nouveau compte
            </Button>
          </Space>
        </div>

        {/* Filtres */}
        <Card size="small" style={{ marginBottom: 20, background: '#fafafa', borderRadius: 6 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Référentiel :</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Sélectionnez un plan…"
                onChange={handleFrameworkChange}
                value={selectedFramework}
                allowClear showSearch optionFilterProp="label"
                options={frameworks.map((fw) => ({ label: `${fw.code} – ${fw.name}`, value: fw.id }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Nature :</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Toutes les natures"
                onChange={(v) => { setSelectedType(v ?? null); setPagination((p) => ({ ...p, current: 1 })); }}
                value={selectedType}
                allowClear disabled={!selectedFramework}
                showSearch optionFilterProp="label"
                options={types.map((t) => ({ label: `${t.code} – ${t.name}`, value: t.id }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Classe :</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Toutes les classes"
                onChange={(v) => { setSelectedGroup(v ?? null); setPagination((p) => ({ ...p, current: 1 })); }}
                value={selectedGroup}
                allowClear disabled={!selectedFramework}
                showSearch optionFilterProp="label"
                options={groups.map((g) => ({ label: `${g.code} – ${g.name}`, value: g.id }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Recherche :</Text>
              <Input
                placeholder="Code ou libellé…"
                prefix={<SearchOutlined />}
                allowClear
                disabled={!selectedFramework}
                onChange={(e) => { setSearchText(e.target.value); setPagination((p) => ({ ...p, current: 1 })); }}
              />
            </Col>
          </Row>
          {selectedFw && (
            <div style={{ marginTop: 10 }}>
              <Tag color="blue">{selectedFw.code} — {pagination.total} compte(s)</Tag>
            </div>
          )}
        </Card>

        {/* Table ou vide */}
        {!selectedFramework ? (
          <Empty
            image={<BankOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            description={<Text type="secondary">Sélectionnez un référentiel comptable pour afficher ses comptes</Text>}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={accounts}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 1100 }}
            onRow={(record) => ({
              onDoubleClick: () => handleView(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showTotal: (total) => `Total : ${total} compte(s)`,
              onChange: (page, pageSize) => setPagination((prev) => ({ ...prev, current: page, pageSize })),
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default AccountList;