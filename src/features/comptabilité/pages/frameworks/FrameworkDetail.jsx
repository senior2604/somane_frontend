// src/features/comptabilite/pages/frameworks/FrameworkDetail.jsx
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  EditOutlined,
  FolderOutlined,
  GlobalOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ENDPOINTS } from '../../../../config/api'; // ✅ Utiliser ENDPOINTS
import axiosInstance from '../../../../config/axiosInstance'; // ✅ Utiliser axiosInstance
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Title, Text } = Typography;

const FrameworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentFramework, fetchFrameworkById, loading } = useFrameworkStore();
  const [stats, setStats] = useState({
    groupsCount: 0,
    typesCount: 0,
    accountsCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // ✅ useCallback pour mémoriser loadStats
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [groupsRes, typesRes, accountsRes] = await Promise.all([
        axiosInstance.get(`${ENDPOINTS.COMPTA.GROUPS}?framework=${id}`),
        axiosInstance.get(`${ENDPOINTS.COMPTA.TYPES}?framework=${id}`),
        axiosInstance.get(`${ENDPOINTS.COMPTA.ACCOUNTS}?framework=${id}`),
      ]);

      setStats({
        groupsCount: groupsRes.data.results?.length || groupsRes.data.length || 0,
        typesCount: typesRes.data.results?.length || typesRes.data.length || 0,
        accountsCount: accountsRes.data.results?.length || accountsRes.data.length || 0,
      });
    } catch (error) {
      console.error('Erreur stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [id]); // ✅ Dépendance : id

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchFrameworkById(id);
        await loadStats();
      } catch (error) {
        console.error('Erreur chargement:', error);
      }
    };

    loadData();
  }, [id, fetchFrameworkById, loadStats]); // ✅ Toutes les dépendances

  // ... reste du code identique
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentFramework) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Plan comptable introuvable"
          description="Le plan comptable demandé n'existe pas ou a été supprimé."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const isShared = !currentFramework.company || currentFramework.company.length === 0;

  return (
    <div style={{ padding: '24px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '24px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/comptabilite/frameworks')}
          style={{ marginBottom: '16px' }}
        >
          Retour à la liste
        </Button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {currentFramework.code} - {currentFramework.name}
            </Title>
            <Text type="secondary">Détails du plan comptable</Text>
          </div>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="large"
            onClick={() => navigate(`/comptabilite/frameworks/${id}/edit`)}
          >
            Modifier
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Classes de comptes"
              value={stats.groupsCount}
              prefix={<FolderOutlined />}
              loading={loadingStats}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Natures de comptes"
              value={stats.typesCount}
              prefix={<TagsOutlined />}
              loading={loadingStats}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Comptes comptables"
              value={stats.accountsCount}
              prefix={<BankOutlined />}
              loading={loadingStats}
            />
          </Card>
        </Col>
      </Row>

      {/* Informations détaillées */}
      <Card
        title="Informations du plan comptable"
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}
      >
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Code">
            <strong style={{ color: '#1890ff' }}>{currentFramework.code}</strong>
          </Descriptions.Item>

          <Descriptions.Item label="Nom">
            {currentFramework.name}
          </Descriptions.Item>

          <Descriptions.Item label="Version">
            {currentFramework.version || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Pays">
            {currentFramework.country?.nom || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Groupement de pays">
            {currentFramework.country_group || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Statut">
            <Tag color={currentFramework.active ? 'success' : 'default'}>
              {currentFramework.active ? 'Actif' : 'Inactif'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Portée" span={2}>
            {isShared ? (
              <Tag color="green" icon={<GlobalOutlined />}>
                Partagé - Toutes les entités
              </Tag>
            ) : (
              <Tag color="blue" icon={<ApartmentOutlined />}>
                Spécifique - {currentFramework.company.length} entité(s)
              </Tag>
            )}
          </Descriptions.Item>

          {!isShared && (
            <Descriptions.Item label="Entités concernées" span={2}>
              <Space wrap>
                {currentFramework.company_names?.map((name, index) => (
                  <Tag key={index} color="blue">
                    {name}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}

          <Descriptions.Item label="Description" span={2}>
            {currentFramework.description || <Text type="secondary">Aucune description</Text>}
          </Descriptions.Item>

          <Descriptions.Item label="Créé le">
            {new Date(currentFramework.created_at).toLocaleString('fr-FR')}
          </Descriptions.Item>

          <Descriptions.Item label="Modifié le">
            {new Date(currentFramework.updated_at).toLocaleString('fr-FR')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Actions rapides */}
      <Card
        title="Actions rapides"
        bordered={false}
        style={{
          marginTop: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        }}
      >
        <Space size="middle" wrap>
          <Button
            icon={<FolderOutlined />}
            onClick={() => navigate(`/comptabilite/groups?framework=${id}`)}
          >
            Voir les classes ({stats.groupsCount})
          </Button>
          <Button
            icon={<TagsOutlined />}
            onClick={() => navigate(`/comptabilite/types?framework=${id}`)}
          >
            Voir les natures ({stats.typesCount})
          </Button>
          <Button
            icon={<BankOutlined />}
            onClick={() => navigate(`/comptabilite/accounts?framework=${id}`)}
          >
            Voir les comptes ({stats.accountsCount})
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default FrameworkDetail;