// src/features/comptabilité/pages/accounts/AccountDetail.jsx
import {
  ArrowLeftOutlined,
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
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
import useAccountStore from '../../../../stores/comptabilite/accountStore';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const BoolIcon = ({ value }) =>
  value
    ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
    : <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />;

const AccountDetail = () => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { fetchAccountById, deleteAccount } = useAccountStore();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const initPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAccountById(id);
      setAccount(data);
    } catch {
      message.error('Impossible de charger le compte');
      navigate('/comptabilite/accounts');
    } finally {
      setLoading(false);
    }
  }, [id, fetchAccountById, navigate]);

  useEffect(() => { initPage(); }, [initPage]);

  const handleDelete = useCallback(() => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer le compte <strong>{account?.code} – {account?.name}</strong> ?<br />
          <Text type="danger" style={{ fontSize: 12 }}>Cette action est irréversible.</Text>
        </span>
      ),
      okText: 'Supprimer', okType: 'danger', cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteAccount(id);
          message.success('Compte supprimé');
          navigate('/comptabilite/accounts');
        } catch {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  }, [account, id, deleteAccount, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" tip="Chargement…" />
      </div>
    );
  }

  if (!account) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Barre d'actions ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/comptabilite/accounts')}>
          Retour à la liste
        </Button>
        <Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/comptabilite/accounts/${id}/edit`)}>
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
                <BankOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                <div>
                  <Title level={3} style={{ margin: 0 }}>{account.code} – {account.name}</Title>
                  <Space size={8} wrap>
                    <Tag color="blue">{account.framework_name || `Référentiel #${account.framework}`}</Tag>
                    {account.type_name  && <Tag color="geekblue">{account.type_name}</Tag>}
                    {account.group_name && <Tag>{account.group_name}</Tag>}
                    <Badge status={account.active ? 'success' : 'default'} text={account.active ? 'Actif' : 'Inactif'} />
                  </Space>
                </div>
              </Space>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Descriptions column={{ xs: 1, sm: 2 }} size="middle" labelStyle={{ fontWeight: 600, color: '#595959' }}>

              <Descriptions.Item label="Code">
                <Text code style={{ fontSize: 15 }}>{account.code}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Référentiel">
                <Tag color="blue">{account.framework_name || `#${account.framework}`}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Nature" span={2}>
                {account.type_name
                  ? <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => navigate(`/comptabilite/types/${account.type}`)}>
                      {account.type_name}
                    </Button>
                  : <Text type="secondary">–</Text>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Classe" span={2}>
                {account.group_name
                  ? <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => navigate(`/comptabilite/groups/${account.group}`)}>
                      {account.group_name}
                    </Button>
                  : <Text type="secondary">–</Text>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Compte parent" span={2}>
                {account.parent
                  ? <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => navigate(`/comptabilite/accounts/${account.parent}`)}>
                      Compte #{account.parent}
                    </Button>
                  : <Tag>Racine</Tag>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Devise">
                {account.currency_name
                  ? <Tag>{account.currency_name}</Tag>
                  : <Text type="secondary">Devise par défaut</Text>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Entité">
                {account.company_name
                  ? <Tag icon={<AuditOutlined />}>{account.company_name}</Tag>
                  : <Text type="secondary">Partagée (toutes entités)</Text>
                }
              </Descriptions.Item>

              <Descriptions.Item label="Lettrable">
                <BoolIcon value={account.reconcile} />
                <Text style={{ marginLeft: 6 }}>{account.reconcile ? 'Oui' : 'Non'}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Statut">
                <Badge status={account.active ? 'success' : 'default'} text={account.active ? 'Actif' : 'Inactif'} />
              </Descriptions.Item>

            </Descriptions>

            {/* Notes */}
            {account.note && (
              <>
                <Divider orientation="left" orientationMargin={0}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Notes</Text>
                </Divider>
                <Paragraph style={{ background: '#fafafa', padding: '12px 16px', borderRadius: 6, border: '1px solid #f0f0f0', whiteSpace: 'pre-wrap' }}>
                  {account.note}
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
                children: (
                  <>
                    <Text strong>Créé</Text><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {account.created_at ? new Date(account.created_at).toLocaleString('fr-FR') : '–'}
                    </Text>
                    {account.created_by && (
                      <><br /><Text type="secondary" style={{ fontSize: 12 }}>par {account.created_by_name || `#${account.created_by}`}</Text></>
                    )}
                  </>
                ),
              },
              {
                color: 'blue',
                children: (
                  <>
                    <Text strong>Dernière modification</Text><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {account.updated_at ? new Date(account.updated_at).toLocaleString('fr-FR') : '–'}
                    </Text>
                    {account.updated_by && (
                      <><br /><Text type="secondary" style={{ fontSize: 12 }}>par {account.updated_by_name || `#${account.updated_by}`}</Text></>
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
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                ['Statut',    <Badge key="s" status={account.active ? 'success' : 'default'} text={account.active ? 'Actif' : 'Inactif'} />],
                ['Lettrable', <BoolIcon key="r" value={account.reconcile} />],
                ['Devise',    <Text key="d">{account.currency_name || 'Par défaut'}</Text>],
                ['Entité',    <Text key="e">{account.company_name  || 'Partagée'}</Text>],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

export default AccountDetail;