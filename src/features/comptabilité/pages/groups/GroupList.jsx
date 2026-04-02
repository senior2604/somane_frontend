// src/features/comptabilite/pages/groups/GroupList.jsx
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
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
import useGroupStore from '../../../../stores/comptabilite/groupStore';

const { Title, Text } = Typography;
const { confirm } = Modal;
const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

const GroupList = () => {
  const navigate = useNavigate();
  const { groups, loading, error, fetchGroups, deleteGroup } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [selectedFramework, setSelectedFramework] = useState(() => {
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => { fetchFrameworks(); }, []);

  useEffect(() => {
    if (selectedFramework) fetchGroups({ framework: selectedFramework });
  }, [selectedFramework]);

  useEffect(() => {
    if (error) message.error(error);
  }, [error]);

  const handleFrameworkChange = (value) => {
    setSelectedFramework(value ?? null);
    if (value) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(value));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  };

  const handleNew  = () => navigate('/comptabilite/groups/new',          { state: { frameworkId: selectedFramework } });
  const handleView = (r) => navigate(`/comptabilite/groups/${r.id}`);
  const handleEdit = (r) => navigate(`/comptabilite/groups/${r.id}/edit`, { state: { frameworkId: selectedFramework } });

  const handleDelete = (record) => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer la classe <strong>{record.code} – {record.name}</strong> ?
          <br />
          <Text type="danger" style={{ fontSize: 12 }}>Cette action est irréversible.</Text>
        </span>
      ),
      okText: 'Supprimer', okType: 'danger', cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteGroup(record.id);
          message.success('Classe supprimée avec succès');
          fetchGroups({ framework: selectedFramework });
        } catch { message.error('Erreur lors de la suppression'); }
      },
    });
  };

  const selectedFw = frameworks.find((f) => f.id === selectedFramework);

  const columns = [
    {
      title: 'Code', dataIndex: 'code', key: 'code', width: 110,
      sorter: (a, b) => a.code.localeCompare(b.code),
      render: (text, record) => (
        <Space>
          {record.children?.length > 0
            ? <FolderOpenOutlined style={{ color: '#faad14' }} />
            : <FolderOutlined    style={{ color: '#8c8c8c' }} />}
          <Text strong style={{ color: '#1677ff', fontFamily: 'monospace' }}>{text}</Text>
        </Space>
      ),
    },
    { title: 'Nom', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: 'Plage de comptes', key: 'range', width: 180,
      render: (_, r) =>
        r.code_prefix_start && r.code_prefix_end ? (
          <Tag color="blue" style={{ fontFamily: 'monospace' }}>
            {r.code_prefix_start} → {r.code_prefix_end}
          </Tag>
        ) : <Text type="secondary">–</Text>,
    },
    {
      title: 'Parent', key: 'parent', width: 165,
      render: (_, record) => {
        if (!record.parent) return <Tag>Racine</Tag>;
        const p = groups.find((g) => g.id === record.parent);
        return p
          ? <Tag icon={<ApartmentOutlined />}>{p.code} – {p.name}</Tag>
          : <Text type="secondary">–</Text>;
      },
    },
    {
      title: 'Sous-classes', key: 'children_count', width: 110, align: 'center',
      render: (_, r) => {
        const count = r.children?.length || 0;
        return (
          <Badge
            count={count}
            showZero
            style={{ backgroundColor: count > 0 ? '#52c41a' : '#d9d9d9', color: '#fff' }}
          />
        );
      },
    },
    {
      title: 'Séq.', dataIndex: 'sequence', key: 'sequence', width: 70, align: 'center',
      sorter: (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
      render: (v) => <Text type="secondary" style={{ fontFamily: 'monospace' }}>{v ?? 0}</Text>,
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
            <Title level={3} style={{ margin: 0 }}>Classes / Groupes de comptes</Title>
            <Text type="secondary">Gérez la structure hiérarchique des comptes de vos plans comptables</Text>
          </div>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleNew} disabled={!selectedFramework}>
            Nouvelle classe
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
              allowClear
              showSearch
              optionFilterProp="label"
              options={frameworks.map((fw) => ({ label: `${fw.code} – ${fw.name}`, value: fw.id }))}
            />
            {selectedFw && (
              <Tag color="blue">{selectedFw.code} — {groups.length} classe(s)</Tag>
            )}
          </Space>
        </Card>

        {/* Table ou état vide */}
        {!selectedFramework ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">Sélectionnez un référentiel comptable pour afficher ses classes</Text>}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={groups}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onDoubleClick: () => handleView(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              pageSizeOptions: ['10', '25', '50'],
              showTotal: (total) => `Total : ${total} classe(s)`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default GroupList;