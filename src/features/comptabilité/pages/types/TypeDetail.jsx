// src/features/comptabilité/pages/types/TypeDetail.jsx
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  TagOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const CLOSING_BEHAVIOR_LABEL = {
  none:          'Aucun',
  carry_forward: 'Report à nouveau',
};

const TypeDetail = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { fetchTypeById, deleteType } = useTypeStore();

  const [type, setType]       = useState(null);
  const [loading, setLoading] = useState(true);

  const initPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTypeById(id);
      setType(data);
    } catch {
      message.error('Impossible de charger la nature');
      navigate('/comptabilite/types');
    } finally {
      setLoading(false);
    }
  }, [id, fetchTypeById, navigate]);

  useEffect(() => { initPage(); }, [initPage]);

  const handleDelete = useCallback(() => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer la nature <strong>{type?.code} – {type?.name}</strong> ?<br />
          <Text type="danger" style={{ fontSize: 12 }}>Cette action est irréversible.</Text>
        </span>
      ),
      okText: 'Supprimer', okType: 'danger', cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteType(id);
          message.success('Nature supprimée');
          navigate('/comptabilite/types');
        } catch {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  }, [type, id, deleteType, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" tip="Chargement…" />
      </div>
    );
  }

  if (!type) return null;

  const BoolIcon = ({ value }) =>
    value
      ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
      : <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Barre d'actions ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/comptabilite/types')}>
          Retour à la liste
        </Button>
        <Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/comptabilite/types/${id}/edit`)}>
            Modifier
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            Supprimer
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>

        {/* ── Carte principale ───────────────────────────────────── */}
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8 }}>

            {/* En-tête */}
            <div style={{ marginBottom: 24 }}>
              <Space align="center" size={12} wrap>
                <TagOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                <div>
                  <Title level={3} style={{ margin: 0 }}>{type.code} – {type.name}</Title>
                  <Space size={8} wrap>
                    {/* ✅ Affiche le NOM du groupe via internal_group_name */}
                    {type.internal_group_name
                      ? <Tag color="purple">{type.internal_group_name}</Tag>
                      : <Tag color="default">Sans groupe</Tag>
                    }
                    <Badge status={type.active ? 'success' : 'default'} text={type.active ? 'Actif' : 'Inactif'} />
                  </Space>
                </div>
              </Space>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Descriptions
              column={{ xs: 1, sm: 2 }}
              size="middle"
              styles={{ label: { fontWeight: 600, color: '#595959' } }}
            >
              <Descriptions.Item label="Code">
                <Text code style={{ fontSize: 14 }}>{type.code}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Référentiel">
                <Tag color="blue">{type.framework_name || `#${type.framework}`}</Tag>
              </Descriptions.Item>

              {/* ✅ Groupe interne : affiche le NOM du groupe (FK AccountGroup) */}
              <Descriptions.Item label="Groupe / Classe principale" span={2}>
                {type.internal_group_name
                  ? <Tag color="purple">{type.internal_group_name}</Tag>
                  : <Text type="secondary">–</Text>
                }
              </Descriptions.Item>

              {/* ✅ Nature parente : affiche le NOM de la nature parente */}
              <Descriptions.Item label="Nature parente" span={2}>
                {type.parent
                  ? (
                    <Button
                      type="link"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => navigate(`/comptabilite/types/${type.parent}`)}
                    >
                      {/* Affiche parent_name si disponible, sinon fallback sur l'ID */}
                      {type.parent_name || `Nature #${type.parent}`}
                    </Button>
                  )
                  : <Tag>Racine (aucun parent)</Tag>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Solde par défaut">
                {type.default_balance_type === 'debit'
                  ? <Tag color="blue">Débit</Tag>
                  : <Tag color="green">Crédit</Tag>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Comportement clôture">
                <Tag>{CLOSING_BEHAVIOR_LABEL[type.closing_behavior] || type.closing_behavior || '–'}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Généralement débiteur">
                <Space>
                  <BoolIcon value={type.default_debit} />
                  <Text>{type.default_debit ? 'Oui' : 'Non'}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Généralement créditeur">
                <Space>
                  <BoolIcon value={type.default_credit} />
                  <Text>{type.default_credit ? 'Oui' : 'Non'}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Lettrage autorisé">
                <Space>
                  <BoolIcon value={type.allow_reconciliation} />
                  <Text>{type.allow_reconciliation ? 'Oui' : 'Non'}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Bilan d'ouverture">
                <Space>
                  <BoolIcon value={type.include_in_opening_balance} />
                  <Text>{type.include_in_opening_balance ? 'Oui' : 'Non'}</Text>
                </Space>
              </Descriptions.Item>
            </Descriptions>

            {/* Notes */}
            {type.note && (
              <>
                <Divider orientation="left" orientationMargin={0}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Notes</Text>
                </Divider>
                <Paragraph style={{
                  background: '#fafafa', padding: '12px 16px',
                  borderRadius: 6, border: '1px solid #f0f0f0', whiteSpace: 'pre-wrap',
                }}>
                  {type.note}
                </Paragraph>
              </>
            )}
          </Card>
        </Col>

        {/* ── Panneau latéral ────────────────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            bordered={false}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8 }}
            title={<Space><CalendarOutlined /><span>Traçabilité</span></Space>}
          >
            <Timeline items={[
              {
                color: 'green',
                content: (
                  <>
                    <Text strong>Créé</Text><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {type.created_at ? new Date(type.created_at).toLocaleString('fr-FR') : '–'}
                    </Text>
                    {type.created_by && (
                      <><br /><Text type="secondary" style={{ fontSize: 12 }}>
                        par {type.created_by_name || `#${type.created_by}`}
                      </Text></>
                    )}
                  </>
                ),
              },
              {
                color: 'blue',
                content: (
                  <>
                    <Text strong>Dernière modification</Text><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {type.updated_at ? new Date(type.updated_at).toLocaleString('fr-FR') : '–'}
                    </Text>
                    {type.updated_by && (
                      <><br /><Text type="secondary" style={{ fontSize: 12 }}>
                        par {type.updated_by_name || `#${type.updated_by}`}
                      </Text></>
                    )}
                  </>
                ),
              },
            ]} />
          </Card>

          {/* Résumé rapide */}
          <Card
            bordered={false} size="small"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8, marginTop: 16 }}
            title="Résumé"
          >
            <Space orientation="vertical" style={{ width: '100%' }}>
              {[
                ['Statut',         <Badge key="s" status={type.active ? 'success' : 'default'} text={type.active ? 'Actif' : 'Inactif'} />],
                ['Groupe',         <Text key="g">{type.internal_group_name || '–'}</Text>],
                ['Parent',         <Text key="p">{type.parent_name || 'Racine'}</Text>],
                ['Lettrage',       <BoolIcon key="l" value={type.allow_reconciliation} />],
                ['Bilan ouverture',<BoolIcon key="b" value={type.include_in_opening_balance} />],
                ['Débiteur',       <BoolIcon key="d" value={type.default_debit} />],
                ['Créditeur',      <BoolIcon key="c" value={type.default_credit} />],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <Text type="secondary">{label}</Text>
                  {val}
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TypeDetail;