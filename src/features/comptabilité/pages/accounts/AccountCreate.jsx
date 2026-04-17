// src/features/comptabilité/pages/accounts/AccountCreate.jsx
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import {
  Alert,
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
  Switch,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useAccountStore from '../../../../stores/comptabilite/accountStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { TextArea } = Input;
const { Title, Text } = Typography;

const FRAMEWORK_SESSION_KEY = 'account_list_selected_framework';

const AccountCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const { createAccount } = useAccountStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);

  // États pour les données chargées dynamiquement
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entities, setEntities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [parentAccounts, setParentAccounts] = useState([]);

  // Chargement des types et groupes
  const loadTypesAndGroups = useCallback(async (fwId) => {
    try {
      const [typesRes, groupsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: fwId } }),
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: fwId } }),
      ]);
      setTypes(typesRes.data.results || typesRes.data);
      setGroups(groupsRes.data.results || groupsRes.data);
    } catch (err) {
      console.error('Erreur chargement types/groupes', err);
    }
  }, []);

  // Chargement des comptes parents possibles
  const loadParentAccounts = useCallback(async (fwId) => {
    if (!fwId) {
      setParentAccounts([]);
      return;
    }

    try {
      const res = await axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, {
        params: {
          framework: fwId,
          company__isnull: true,   // On privilégie les comptes racines partagés
          page_size: 500,
          ordering: 'code',
        },
      });

      const accounts = res.data.results || res.data || [];

      const options = accounts.map((acc) => ({
        label: `${acc.code} - ${acc.name}`,
        value: acc.id,
      }));

      setParentAccounts(options);
    } catch (err) {
      console.error('Erreur chargement comptes parents', err);
      message.warning('Impossible de charger les comptes parents');
      setParentAccounts([]);
    }
  }, []);

  // Initialisation de la page
  const initPage = useCallback(async () => {
    setLoading(true);
    try {
      const [, entitiesRes, currenciesRes] = await Promise.all([
        fetchFrameworks(),
        axiosInstance.get(ENDPOINTS.ENTITES),
        axiosInstance.get(ENDPOINTS.DEVISES),
      ]);

      setEntities(entitiesRes.data.results || entitiesRes.data);
      setCurrencies(currenciesRes.data.results || currenciesRes.data);

      // Récupération du framework sélectionné (depuis state ou session)
      const fromState = location.state?.frameworkId ?? null;
      const fromSession = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
      const fwId = fromState ?? (fromSession ? parseInt(fromSession, 10) : null);

      if (fwId) {
        setSelectedFramework(fwId);
        form.setFieldValue('framework', fwId);
        await Promise.all([
          loadTypesAndGroups(fwId),
          loadParentAccounts(fwId),
        ]);
      }

      // Valeurs par défaut
      form.setFieldsValue({
        active: true,
        reconcile: false,
        account_type: 'total',
        locked: false,
        closing_type: true,
      });
    } catch (err) {
      console.error(err);
      message.error('Erreur lors du chargement initial');
    } finally {
      setLoading(false);
    }
  }, [fetchFrameworks, form, loadTypesAndGroups, loadParentAccounts, location.state]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  // Changement de référentiel
  const handleFrameworkChange = async (fwId) => {
    setSelectedFramework(fwId);
    form.setFieldsValue({ type: null, group: null, parent: null });

    if (fwId) {
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));
      await Promise.all([
        loadTypesAndGroups(fwId),
        loadParentAccounts(fwId),
      ]);
    } else {
      setParentAccounts([]);
    }
  };

  // Soumission du formulaire
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await createAccount(values);
      message.success('Compte créé avec succès !');
      navigate('/comptabilite/accounts');
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, errors]) => {
          const msg = Array.isArray(errors) ? errors.join(', ') : String(errors);
          message.error(`${field.toUpperCase()} : ${msg}`);
        });
      } else {
        message.error(error.message || 'Erreur lors de la création du compte');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedFw = frameworks.find((f) => f.id === selectedFramework);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 8 }}
        loading={loading && !frameworks.length}
      >
        <div style={{ marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0 }}>Créer un nouveau compte comptable</Title>
          <Text type="secondary">Ajoutez un nouveau compte au plan comptable</Text>
        </div>

        {selectedFw && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
            message={
              <span>
                Référentiel actif :{' '}
                <Text strong style={{ color: '#1677ff' }}>
                  {selectedFw.code} – {selectedFw.name}
                </Text>
              </span>
            }
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional" size="large">
          {/* Informations générales */}
          <Divider orientation="left" orientationMargin={0}>Informations générales</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="framework" label="Référentiel comptable" rules={[{ required: true }]}>
                <Select
                  placeholder="Sélectionnez un plan comptable"
                  onChange={handleFrameworkChange}
                  showSearch
                  optionFilterProp="label"
                  options={frameworks.map((fw) => ({
                    label: `${fw.code} – ${fw.name}`,
                    value: fw.id,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="code" label="Code du compte" rules={[{ required: true, max: 64 }]}>
                <Input placeholder="ex : 411001" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={4}>
              <Form.Item name="active" label="Actif" valuePropName="checked">
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="name" label="Libellé du compte" rules={[{ required: true, max: 255 }]}>
            <Input placeholder="ex : Clients – ventes de produits" />
          </Form.Item>

          {/* Compte parent - CORRIGÉ */}
          <Form.Item
            name="parent"
            label="Compte parent"
            tooltip="Compte dont dépend ce nouveau compte dans la hiérarchie (optionnel)"
          >
            <Select
              placeholder="Aucun (compte racine)"
              allowClear
              disabled={!selectedFramework}
              showSearch
              optionFilterProp="label"
              options={parentAccounts}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* Classification */}
          <Divider orientation="left" orientationMargin={0}>Classification</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="type" label="Nature du compte" rules={[{ required: true }]}>
                <Select
                  placeholder="Sélectionnez une nature"
                  disabled={!selectedFramework}
                  showSearch
                  optionFilterProp="label"
                  options={types.map((t) => ({ label: `${t.code || ''} – ${t.name}`, value: t.id }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="group" label="Classe / Groupe">
                <Select
                  placeholder="Sélectionnez une classe (optionnel)"
                  allowClear
                  disabled={!selectedFramework}
                  showSearch
                  optionFilterProp="label"
                  options={groups.map((g) => ({ label: `${g.code} – ${g.name}`, value: g.id }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Paramètres comptables */}
          <Divider orientation="left" orientationMargin={0}>Paramètres comptables</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="currency" label="Devise">
                <Select
                  placeholder="Devise par défaut"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={currencies.map((c) => ({
                    label: `${c.code} – ${c.nom || c.name}`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="reconcile" label="Lettrable" valuePropName="checked">
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="locked" label="Verrouillé" valuePropName="checked">
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="account_type" label="Type de compte">
                <Select>
                  <Select.Option value="total">Total</Select.Option>
                  <Select.Option value="detail">Détail</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="closing_type" label="Comportement à la clôture" valuePropName="checked">
                <Switch checkedChildren="Clôturer" unCheckedChildren="Ne pas clôturer" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="length" label="Longueur exacte du code">
                <Input type="number" min={1} max={20} placeholder="ex: 10" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="company"
            label="Entité spécifique"
            tooltip="Laissez vide pour un compte partagé (racine)"
          >
            <Select
              placeholder="Toutes les entités (compte racine partagé)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={entities.map((e) => ({
                label: e.raison_sociale || e.name,
                value: e.id,
              }))}
            />
          </Form.Item>

          {/* Notes */}
          <Divider orientation="left" orientationMargin={0}>Notes</Divider>
          <Form.Item name="note" label="Notes / Description">
            <TextArea rows={4} placeholder="Description détaillée, utilisation, remarques..." showCount maxLength={1000} />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" loading={loading}>
                Créer le compte
              </Button>
              <Button size="large" icon={<CloseOutlined />} onClick={() => navigate('/comptabilite/accounts')}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AccountCreate;