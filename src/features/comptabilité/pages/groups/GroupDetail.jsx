// src/features/comptabilite/pages/groups/GroupDetail.jsx
import {
  ArrowLeftOutlined,
  AuditOutlined,
  CalendarOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useGroupStore from '../../../../stores/comptabilite/groupStore';


const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const GroupDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchGroupById, fetchGroups, groups, deleteGroup } = useGroupStore();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const data = await fetchGroupById(id);
        setGroup(data);
        // Charger les groupes du même framework pour afficher parent/enfants
        if (data.framework) {
          await fetchGroups({ framework: data.framework });
        }
      } catch {
        message.error('Impossible de charger la classe');
        navigate('/comptabilite/groups');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const handleDelete = () => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer la classe <strong>{group?.code} – {group?.name}</strong> ?
          <br />
          <Text type="danger" style={{ fontSize: 12 }}>
            Cette action est irréversible.
          </Text>
        </span>
      ),
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteGroup(id);
          message.success('Classe supprimée');
          navigate('/comptabilite/groups');
        } catch {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" tip="Chargement…" />
      </div>
    );
  }

  if (!group) return null;

  const parent  = groups.find((g) => g.id === group.parent);
  const children = groups.filter((g) => g.parent === group.id);

  // ── Colonnes sous-classes ──────────────────────────────────────────────
  const childColumns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (v) => (
        <Text strong style={{ fontFamily: 'monospace', color: '#1677ff' }}>
          {v}
        </Text>
      ),
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Plage',
      key: 'range',
      width: 160,
      render: (_, rec) =>
        rec.code_prefix_start && rec.code_prefix_end ? (
          <Tag color="blue" style={{ fontFamily: 'monospace' }}>
            {rec.code_prefix_start} → {rec.code_prefix_end}
          </Tag>
        ) : (
          <Text type="secondary">–</Text>
        ),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_, rec) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/comptabilite/groups/${rec.id}`)}
        >
          Voir
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ── Barre d'actions ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/comptabilite/groups')}
        >
          Retour à la liste
        </Button>

        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/comptabilite/groups/${id}/edit`)}
          >
            Modifier
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            Supprimer
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* ── Carte principale ─────────────────────────────────────────── */}
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8 }}
          >
            {/* En-tête */}
            <div style={{ marginBottom: 24 }}>
              <Space align="center" size={12} wrap>
                <FolderOutlined
                  style={{
                    fontSize: 32,
                    color: children.length > 0 ? '#faad14' : '#8c8c8c',
                  }}
                />
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {group.code} – {group.name}
                  </Title>
                  <Space size={8} wrap>
                    <Tag color="blue" icon={<CodeOutlined />}>
                      {group.framework_name || `Référentiel #${group.framework}`}
                    </Tag>
                    {group.code_prefix_start && group.code_prefix_end && (
                      <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>
                        {group.code_prefix_start} → {group.code_prefix_end}
                      </Tag>
                    )}
                    <Badge
                      count={children.length}
                      showZero
                      style={{
                        backgroundColor: children.length > 0 ? '#52c41a' : '#d9d9d9',
                      }}
                      title={`${children.length} sous-classe(s)`}
                    />
                  </Space>
                </div>
              </Space>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {group.code_prefix_start && group.code_prefix_end && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={
                  <span>
                    Cette classe couvre les comptes de{' '}
                    <Text code>{group.code_prefix_start}</Text> à{' '}
                    <Text code>{group.code_prefix_end}</Text>
                    {group.excluded_accounts_detail?.length > 0 && (
                      <span>
                        , à l'exception des comptes dont la racine commence par{' '}
                        {group.excluded_accounts_detail.map((acc, i) => (
                          <span key={acc.id}>
                            <Text code style={{ color: '#cf1322' }}>{acc.code}</Text>
                            {i < group.excluded_accounts_detail.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                }
              />
            )}

            {/* Descriptions principales */}
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              size="middle"
              labelStyle={{ fontWeight: 600, color: '#595959' }}
            >
              <Descriptions.Item label="Code" span={1}>
                <Text code style={{ fontSize: 15 }}>{group.code}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Séquence" span={1}>
                <Text>{group.sequence ?? 0}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Référentiel" span={2}>
                <Tag color="blue">
                  {group.framework_name || `#${group.framework}`}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Plage de comptes" span={2}>
                {group.code_prefix_start && group.code_prefix_end ? (
                  <Space>
                    <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>
                      {group.code_prefix_start}
                    </Tag>
                    <Text type="secondary">→</Text>
                    <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>
                      {group.code_prefix_end}
                    </Tag>
                  </Space>
                ) : (
                  <Text type="secondary">Non définie</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Classe parente" span={2}>
                {parent ? (
                  <Button
                    type="link"
                    style={{ padding: 0, height: 'auto' }}
                    icon={<NodeIndexOutlined />}
                    onClick={() => navigate(`/comptabilite/groups/${parent.id}`)}
                  >
                    {parent.code} – {parent.name}
                  </Button>
                ) : (
                  <Tag>Racine (aucun parent)</Tag>
                )}
              </Descriptions.Item>

              {group.company?.length > 0 && (
                <Descriptions.Item label="Sociétés" span={2}>
                  <Space wrap>
                    {group.company.map((c) => (
                      <Tag key={c} icon={<AuditOutlined />}>
                        Société #{c}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

              {group.excluded_accounts_detail?.length > 0 && (
                <Descriptions.Item label="Comptes exclus" span={2}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined /> Les comptes commençant par ces racines sont exclus 
                      de la plage {group.code_prefix_start} → {group.code_prefix_end}
                    </Text>
                    <Space wrap>
                      {group.excluded_accounts_detail.map((acc) => (
                        <Tag
                          key={acc.id}
                          color="red"
                          style={{ fontFamily: 'monospace', fontSize: 13 }}
                          title={`${acc.code} – ${acc.name} (exclu de cette plage)`}
                        >
                          🚫 {acc.code} — {acc.name}
                        </Tag>
                      ))}
                    </Space>
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Notes */}
            {group.note && (
              <>
                <Divider orientation="left" orientationMargin={0}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <InfoCircleOutlined /> Notes
                  </Text>
                </Divider>
                <Paragraph
                  style={{
                    background: '#fafafa',
                    padding: '12px 16px',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {group.note}
                </Paragraph>
              </>
            )}
          </Card>

          {/* ── Sous-classes ──────────────────────────────────────────── */}
          <Card
            bordered={false}
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8,
              marginTop: 16,
            }}
            title={
              <Space>
                <FolderOutlined />
                <span>Sous-classes ({children.length})</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                size="small"
                onClick={() =>
                  navigate('/comptabilite/groups/new', {
                    state: {
                      frameworkId: group.framework,
                      parentId: group.id,
                    },
                  })
                }
              >
                + Ajouter une sous-classe
              </Button>
            }
          >
            {children.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Aucune sous-classe"
              />
            ) : (
              <Table
                columns={childColumns}
                dataSource={children}
                rowKey="id"
                size="small"
                pagination={false}
              />
            )}
          </Card>
        </Col>

        {/* ── Panneau latéral : traçabilité ─────────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            bordered={false}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8 }}
            title={
              <Space>
                <CalendarOutlined />
                <span>Traçabilité</span>
              </Space>
            }
          >
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Créé</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {group.created_at
                          ? new Date(group.created_at).toLocaleString('fr-FR')
                          : '–'}
                      </Text>
                      {group.created_by && (
                        <>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            par {group.created_by_name || `#${group.created_by}`}
                          </Text>
                        </>
                      )}
                    </>
                  ),
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>Dernière modification</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {group.updated_at
                          ? new Date(group.updated_at).toLocaleString('fr-FR')
                          : '–'}
                      </Text>
                      {group.updated_by && (
                        <>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            par {group.updated_by_name || `#${group.updated_by}`}
                          </Text>
                        </>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </Card>

          {/* Informations rapides */}
          <Card
            bordered={false}
            size="small"
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8,
              marginTop: 16,
            }}
            title="Informations rapides"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Type</Text>
                <Tag>{children.length > 0 ? 'Groupe' : 'Feuille'}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Sous-classes</Text>
                <Text strong>{children.length}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Sociétés</Text>
                <Text strong>{group.company?.length || 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Comptes exclus</Text>
                <Text strong>{group.excluded_accounts_detail?.length || 0}</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GroupDetail;