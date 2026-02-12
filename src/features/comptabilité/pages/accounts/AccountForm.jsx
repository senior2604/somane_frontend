// src/features/comptabilite/pages/accounts/AccountForm.jsx

import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance'; // ✅ Client centralisé
import useAccountStore from '../../../../stores/comptabilite/accountStore'; // ✅ NOUVEAU
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const AccountForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  
  // ✅ Utilisation des stores
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const { createAccount, updateAccount, fetchAccountById, loading: accountLoading } = useAccountStore();

  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entities, setEntities] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    loadFormData();
  }, [id]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Charger les données de référence
      await fetchFrameworks();
      const [entitiesRes, currenciesRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.ENTITIES),
        axiosInstance.get(ENDPOINTS.DEVISES),
      ]);

      setEntities(entitiesRes.data.results || entitiesRes.data);
      setCurrencies(currenciesRes.data.results || currenciesRes.data);

      // Si édition, charger le compte
      if (id) {
        const account = await fetchAccountById(id);

        setSelectedFramework(account.framework);
        await loadTypesAndGroups(account.framework);

        form.setFieldsValue({
          framework: account.framework,
          code: account.code,
          name: account.name,
          type: account.type,
          group: account.group,
          company: account.company,
          opening_balance: account.opening_balance,
          currency: account.currency,
          reconcile: account.reconcile,
          active: account.active !== false,
          note: account.note,
        });
      } else {
        form.setFieldsValue({ active: true, reconcile: false, opening_balance: 0 });
      }
    } catch (error) {
      message.error('Impossible de charger les données');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTypesAndGroups = async (frameworkId) => {
    try {
      const [typesRes, groupsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: frameworkId } }),
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: frameworkId } }),
      ]);

      setTypes(typesRes.data.results || typesRes.data);
      setGroups(groupsRes.data.results || groupsRes.data);
    } catch (error) {
      console.error('Erreur chargement types/groupes:', error);
    }
  };

  const handleFrameworkChange = async (frameworkId) => {
    setSelectedFramework(frameworkId);
    form.setFieldsValue({ type: null, group: null });
    await loadTypesAndGroups(frameworkId);
  };

  const onFinish = async (values) => {
    try {
      if (id) {
        await updateAccount(id, values);
        message.success('Compte modifié avec succès');
      } else {
        await createAccount(values);
        message.success('Compte créé avec succès');
      }
      navigate('/comptabilite/accounts');
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Erreur lors de la sauvegarde';
      message.error(errorMessage);
      console.error(error);
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
            {id ? 'Modifier le compte comptable' : 'Créer un nouveau compte'}
          </Title>
          <Text type="secondary">
            {id
              ? 'Modifiez les informations du compte'
              : 'Ajoutez un nouveau compte au plan comptable'}
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
              <Col xs={24} md={12}>
                <Form.Item
                  name="framework"
                  label="Référentiel comptable"
                  rules={[{ required: true, message: 'Sélectionnez un référentiel' }]}
                >
                  <Select
                    placeholder="Sélectionnez un plan comptable"
                    onChange={handleFrameworkChange}
                    disabled={!!id}
                  >
                    {frameworks.map((fw) => (
                      <Option key={fw.id} value={fw.id}>
                        {fw.code} - {fw.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  name="code"
                  label="Code du compte"
                  rules={[
                    { required: true, message: 'Le code est obligatoire' },
                    { max: 64, message: 'Maximum 64 caractères' },
                  ]}
                  tooltip="Numéro unique du compte (ex: 101, 411001)"
                >
                  <Input placeholder="ex: 411001" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  name="active"
                  label="Actif"
                  valuePropName="checked"
                  tooltip="Seuls les comptes actifs peuvent être utilisés"
                >
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="name"
              label="Libellé du compte"
              rules={[
                { required: true, message: 'Le libellé est obligatoire' },
                { max: 255, message: 'Maximum 255 caractères' },
              ]}
            >
              <Input placeholder="ex: Client ABC" />
            </Form.Item>

            <Divider orientation="left">Classification</Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="type"
                  label="Nature du compte"
                  rules={[{ required: true, message: 'Sélectionnez une nature' }]}
                  tooltip="Type/Nature du compte (ex: Immobilisation, Tiers, Banque)"
                >
                  <Select placeholder="Sélectionnez une nature" disabled={!selectedFramework}>
                    {types.map((type) => (
                      <Option key={type.id} value={type.id}>
                        {type.code} - {type.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="group"
                  label="Classe du compte"
                  tooltip="Classe/Groupe auquel appartient le compte (optionnel)"
                >
                  <Select
                    placeholder="Sélectionnez une classe (optionnel)"
                    allowClear
                    disabled={!selectedFramework}
                  >
                    {groups.map((group) => (
                      <Option key={group.id} value={group.id}>
                        {group.code} - {group.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Paramètres comptables</Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="opening_balance"
                  label="Solde d'ouverture"
                  tooltip="Solde initial du compte"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    step={0.01}
                    precision={2}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="currency" label="Devise" tooltip="Devise du compte (optionnel)">
                  <Select placeholder="Sélectionnez une devise" allowClear>
                    {currencies.map((currency) => (
                      <Option key={currency.id} value={currency.id}>
                        {currency.code} - {currency.nom}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="reconcile"
                  label="Compte lettrable"
                  valuePropName="checked"
                  tooltip="Autorise le lettrage des écritures sur ce compte"
                >
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="company"
                  label="Entité spécifique"
                  tooltip="Laissez vide pour un compte partagé"
                >
                  <Select placeholder="Toutes les entités (partagé)" allowClear>
                    {entities.map((entity) => (
                      <Option key={entity.id} value={entity.id}>
                        {entity.name || entity.raison_sociale}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Informations complémentaires</Divider>

            <Form.Item name="note" label="Notes / Description">
              <TextArea
                rows={3}
                placeholder="Notes ou description du compte (utilisation, remarques...)"
              />
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
                  onClick={() => navigate('/comptabilite/accounts')}
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

export default AccountForm;