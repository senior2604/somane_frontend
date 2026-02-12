// src/features/comptabilite/pages/frameworks/FrameworkForm.jsx
import { CloseOutlined, GlobalOutlined, SaveOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ENDPOINTS } from '../../../../config/api'; // ✅
import axiosInstance from '../../../../config/axiosInstance'; // ✅
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const FrameworkForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const { createFramework, updateFramework, fetchFrameworkById } = useFrameworkStore();

  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [entities, setEntities] = useState([]);
  const [isShared, setIsShared] = useState(true);

  // ✅ useCallback pour mémoriser loadFormData
  const loadFormData = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les pays
      const countriesRes = await axiosInstance.get(ENDPOINTS.PAYS);
      setCountries(countriesRes.data.results || countriesRes.data);

      // Charger les entités
      const entitiesRes = await axiosInstance.get(ENDPOINTS.ENTITES);
      setEntities(entitiesRes.data.results || entitiesRes.data);

      // Si édition, charger le framework
      if (id) {
        const framework = await fetchFrameworkById(id);
        const shared = !framework.company || framework.company.length === 0;
        setIsShared(shared);
        form.setFieldsValue({
          code: framework.code,
          name: framework.name,
          version: framework.version,
          country: framework.country,
          country_group: framework.country_group,
          shared: shared,
          company: framework.company || [],
          description: framework.description,
          active: framework.active !== false,
        });
      } else {
        form.setFieldsValue({ shared: true, active: true });
      }
    } catch (error) {
      message.error('Impossible de charger les données');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, fetchFrameworkById, form]); // ✅ Dépendances

  useEffect(() => {
    loadFormData();
  }, [loadFormData]); // ✅ Dépendance

  const onFinish = async (values) => {
    // Si partagé, vider la liste des entités
    if (values.shared) {
      values.company = [];
    }

    setLoading(true);
    try {
      if (id) {
        await updateFramework(id, values);
        message.success('Plan comptable modifié avec succès');
      } else {
        await createFramework(values);
        message.success('Plan comptable créé avec succès');
      }
      navigate('/comptabilite/frameworks');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de la sauvegarde';
      message.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}
      >
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0 }}>
            {id ? 'Modifier le plan comptable' : 'Créer un nouveau plan comptable'}
          </Title>
          <Text type="secondary">
            {id
              ? 'Modifiez les informations du référentiel comptable'
              : 'Ajoutez un nouveau référentiel comptable à votre système'}
          </Text>
        </div>

        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark="optional"
            size="large"
          >
            <Divider orientation="left">Informations générales</Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="code"
                  label="Code du plan"
                  rules={[
                    { required: true, message: 'Le code est obligatoire' },
                    { max: 64, message: 'Maximum 64 caractères' },
                  ]}
                  tooltip="Code unique identifiant le plan (ex: SYSCOHADA, PCG, IFRS)"
                >
                  <Input placeholder="ex: SYSCOHADA" />
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
                <Form.Item
                  name="name"
                  label="Nom complet"
                  rules={[
                    { required: true, message: 'Le nom est obligatoire' },
                    { max: 255, message: 'Maximum 255 caractères' },
                  ]}
                >
                  <Input placeholder="ex: SYSCOHADA Révisé 2018" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="version" label="Version">
                  <Input placeholder="ex: 2018, v1.2" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="country" label="Pays principal">
                  <Select
                    placeholder="Sélectionner un pays"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {countries.map((country) => (
                      <Option key={country.id} value={country.id}>
                        {country.nom || country.name || `Pays ${country.id}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="country_group"
                  label="Groupement de pays"
                  tooltip="Ex: UEMOA, UE, CEMAC"
                >
                  <Input placeholder="ex: UEMOA" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Portée du plan</Divider>

            <Form.Item
              name="shared"
              label="Plan comptable partagé"
              valuePropName="checked"
              tooltip="Si activé, ce plan sera utilisable par toutes les entités de l'entreprise"
            >
              <Switch
                checkedChildren={<GlobalOutlined />}
                unCheckedChildren="Spécifique"
                onChange={(checked) => {
                  setIsShared(checked);
                  if (checked) {
                    form.setFieldValue('company', []);
                  }
                }}
              />
            </Form.Item>

            {!isShared && (
              <Form.Item
                name="company"
                label="Entités concernées"
                rules={[
                  {
                    required: !isShared,
                    message: 'Sélectionnez au moins une entité',
                  },
                ]}
                tooltip="Sélectionnez les entités qui utiliseront ce plan comptable"
              >
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les entités"
                  showSearch
                  optionFilterProp="children"
                  maxTagCount={3}
                >
                  {entities.map((entity) => (
                    <Option
                      key={entity.id}
                      value={entity.id}
                      label={entity.name || entity.raison_sociale}
                    >
                      {entity.name || entity.raison_sociale || `Entité ${entity.id}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Divider orientation="left">Informations complémentaires</Divider>

            <Form.Item name="description" label="Description / Notes">
              <TextArea
                rows={4}
                placeholder="Description détaillée du plan, version, spécificités, remarques..."
              />
            </Form.Item>

            <Form.Item
              name="active"
              label="Statut"
              valuePropName="checked"
              tooltip="Seuls les plans actifs peuvent être utilisés"
            >
              <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
            </Form.Item>

            <Divider />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  size="large"
                  loading={loading}
                >
                  {id ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button
                  size="large"
                  icon={<CloseOutlined />}
                  onClick={() => navigate('/comptabilite/frameworks')}
                >
                  Annuler
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default FrameworkForm;