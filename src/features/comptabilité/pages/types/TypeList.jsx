// src/features/comptabilité/pages/types/TypeList.jsx
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { Title, Text } = Typography;
const { confirm } = Modal;

const FRAMEWORK_SESSION_KEY = 'type_list_selected_framework';

const CLOSING_BEHAVIOR_LABEL = {
  none:          'Aucun',
  carry_forward: 'Report à nouveau',
};

const TypeList = () => {
  const navigate = useNavigate();
  const { types, loading, error, fetchTypes, deleteType } = useTypeStore();
  const { frameworks, fetchFrameworks }                    = useFrameworkStore();

  const [selectedFramework, setSelectedFramework] = useState(() => {
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => { fetchFrameworks(); }, [fetchFrameworks]);

  useEffect(() => {
    if (selectedFramework) fetchTypes({ framework: selectedFramework });
  }, [selectedFramework, fetchTypes]);

  useEffect(() => {
    if (error) message.error(error);
  }, [error]);

  const handleFrameworkChange = (value) => {
    setSelectedFramework(value ?? null);
    if (value) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(value));
    else        sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  };

  const handleNew  = () => navigate('/comptabilite/types/new',           { state: { frameworkId: selectedFramework } });
  const handleView = (r) => navigate(`/comptabilite/types/${r.id}`);
  const handleEdit = (r) => navigate(`/comptabilite/types/${r.id}/edit`, { state: { frameworkId: selectedFramework } });

  const handleDelete = (record) => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer la nature <strong>{record.code} – {record.name}</strong> ?<br />
          <Text type="danger" style={{ fontSize: 12 }}>Cette action est irréversible.</Text>
        </span>
      ),
      okText: 'Supprimer', okType: 'danger', cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteType(record.id);
          message.success('Nature supprimée avec succès');
          fetchTypes({ framework: selectedFramework });
        } catch { message.error('Erreur lors de la suppression'); }
      },
    });
  };

  const selectedFw = frameworks.find((f) => f.id === selectedFramework);

  const columns = [
    {
      title: 'Code', dataIndex: 'code', key: 'code', width: 130,
      sorter: (a, b) => a.code.localeCompare(b.code),
      render: (text) => (
        <Text strong style={{ color: '#1677ff', fontFamily: 'monospace' }}>{text}</Text>
      ),
    },
    {
      title: 'Nom', dataIndex: 'name', key: 'name', ellipsis: true,
    },
    {
      // ✅ Affiche le NOM du groupe (FK AccountGroup) via internal_group_name
      title: 'Groupe / Classe', key: 'internal_group', width: 180,
      render: (_, r) =>
        r.internal_group_name
          ? <Tag color="purple">{r.internal_group_name}</Tag>
          : <Text type="secondary">–</Text>,
    },
    {
      // ✅ Affiche le NOM de la nature parente via parent_name
      title: 'Nature parente', key: 'parent', width: 180,
      render: (_, r) =>
        r.parent_name
          ? <Tag color="orange">{r.parent_name}</Tag>
          : <Tag>Racine</Tag>,
    },
    {
      title: 'Solde par défaut', key: 'balance', width: 140,
      render: (_, r) => {
        if (r.default_balance_type === 'debit')  return <Tag color="blue">Débit</Tag>;
        if (r.default_balance_type === 'credit') return <Tag color="green">Crédit</Tag>;
        return <Text type="secondary">–</Text>;
      },
    },
    {
      title: 'Lettrage', dataIndex: 'allow_reconciliation', key: 'allow_reconciliation', width: 100, align: 'center',
      render: (v) => v
        ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        : <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />,
    },
    {
      title: 'Clôture', dataIndex: 'closing_behavior', key: 'closing_behavior', width: 150,
      render: (v) => <Tag>{CLOSING_BEHAVIOR_LABEL[v] || v || '–'}</Tag>,
    },
    {
      title: 'Statut', dataIndex: 'active', key: 'active', width: 90,
      render: (v) => <Badge status={v ? 'success' : 'default'} text={v ? 'Actif' : 'Inactif'} />,
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
            <Title level={3} style={{ margin: 0 }}>Natures de comptes</Title>
            <Text type="secondary">Gérez les types/natures de comptes (Immobilisation, Tiers, Banque…)</Text>
          </div>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleNew} disabled={!selectedFramework}>
            Nouvelle nature
          </Button>
        </div>

        {/* Sélecteur référentiel */}
        <Card size="small" style={{ marginBottom: 20, background: '#fafafa', borderRadius: 6 }}>
          <Space align="center" wrap>
            <Text strong>Référentiel comptable :</Text>
            <Select
              style={{ width: 340 }}
              placeholder="Sélectionnez un plan comptable…"
              onChange={handleFrameworkChange}
              value={selectedFramework}
              allowClear showSearch optionFilterProp="label"
              options={frameworks.map((fw) => ({ label: `${fw.code} – ${fw.name}`, value: fw.id }))}
            />
            {selectedFw && (
              <Tag color="blue">{selectedFw.code} — {types.length} nature(s)</Tag>
            )}
          </Space>
        </Card>

        {/* Table ou vide */}
        {!selectedFramework ? (
          <Empty
            image={<TagsOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            description={<Text type="secondary">Sélectionnez un référentiel comptable pour afficher ses natures</Text>}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={types}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 1100 }}
            onRow={(record) => ({
              onDoubleClick: () => handleView(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              pageSizeOptions: ['10', '25', '50'],
              showTotal: (total) => `Total : ${total} nature(s)`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default TypeList;