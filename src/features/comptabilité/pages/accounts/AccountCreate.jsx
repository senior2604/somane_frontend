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
  const [form]   = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const { createAccount }               = useAccountStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [loading, setLoading]                     = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [types,      setTypes]      = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [entities,   setEntities]   = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const loadTypesAndGroups = useCallback(async (fwId) => {
    try {
      const [typesRes, groupsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES,  { params: { framework: fwId } }),
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: fwId } }),
      ]);
      setTypes(typesRes.data.results   || typesRes.data);
      setGroups(groupsRes.data.results || groupsRes.data);
    } catch { console.error('Erreur chargement types/groupes'); }
  }, []);

  const initPage = useCallback(async () => {
    setLoading(true);
    try {
      const [, entitiesRes, currenciesRes] = await Promise.all([
        fetchFrameworks(),
        axiosInstance.get(ENDPOINTS.ENTITES),
        axiosInstance.get(ENDPOINTS.DEVISES),
      ]);
      setEntities(entitiesRes.data.results     || entitiesRes.data);
      setCurrencies(currenciesRes.data.results || currenciesRes.data);

      const fromState   = location.state?.frameworkId ?? null;
      const fromSession = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
      const fwId        = fromState ?? (fromSession ? parseInt(fromSession, 10) : null);

      if (fwId) {
        setSelectedFramework(fwId);
        form.setFieldValue('framework', fwId);
        await loadTypesAndGroups(fwId);
      }

      form.setFieldsValue({ active: true, reconcile: false });
    } catch {
      message.error('Erreur lors du chargement initial');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { initPage(); }, [initPage]);

  const handleFrameworkChange = async (fwId) => {
    setSelectedFramework(fwId);
    form.setFieldsValue({ type: null, group: null });
    if (fwId) {
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));
      await loadTypesAndGroups(fwId);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await createAccount(values);
      message.success('Compte créé avec succès');
      navigate('/comptabilite/accounts');
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, errors]) => {
          message.error(`${field} : ${Array.isArray(errors) ? errors.join(', ') : String(errors)}`);
        });
      } else {
        message.error(error.message || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedFw = frameworks.find((f) => f.id === selectedFramework);

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
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
            type="info" showIcon style={{ marginBottom: 24 }}
            message={<span>Référentiel actif : <Text strong style={{ color: '#1677ff' }}>{selectedFw.code} – {selectedFw.name}</Text></span>}
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional" size="large">

          {/* ── Informations générales ─────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Informations générales</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="framework" label="Référentiel comptable"
                rules={[{ required: true, message: 'Sélectionnez un référentiel' }]}
              >
                <Select
                  placeholder="Sélectionnez un plan comptable…"
                  onChange={handleFrameworkChange}
                  showSearch optionFilterProp="label"
                  options={frameworks.map((fw) => ({ label: `${fw.code} – ${fw.name}`, value: fw.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="code" label="Code du compte"
                rules={[
                  { required: true, message: 'Le code est obligatoire' },
                  { max: 64, message: 'Maximum 64 caractères' },
                ]}
                tooltip="Numéro unique du compte (ex : 101, 411001)"
              >
                <Input placeholder="ex : 411001" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="active" label="Actif" valuePropName="checked">
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name" label="Libellé du compte"
            rules={[
              { required: true, message: 'Le libellé est obligatoire' },
              { max: 255, message: 'Maximum 255 caractères' },
            ]}
          >
            <Input placeholder="ex : Clients – ventes de produits" />
          </Form.Item>

          {/* ── Compte parent ─────────────────────────────────────── */}
          <Form.Item
            name="parent" label="Compte parent"
            tooltip="Hiérarchie optionnelle entre comptes"
          >
            <Select
              placeholder="Aucun (compte racine)"
              allowClear disabled={!selectedFramework}
              showSearch optionFilterProp="label"
              options={[]}
              // TODO: brancher sur les comptes du même framework
            />
          </Form.Item>

          {/* ── Classification ─────────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Classification</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="type" label="Nature du compte"
                rules={[{ required: true, message: 'Sélectionnez une nature' }]}
                tooltip="Type/Nature du compte (ex : Immobilisation, Tiers, Banque)"
              >
                <Select
                  placeholder="Sélectionnez une nature"
                  disabled={!selectedFramework}
                  showSearch optionFilterProp="label"
                  options={types.map((t) => ({ label: `${t.code} – ${t.name}`, value: t.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="group" label="Classe du compte"
                tooltip="Classe/Groupe auquel appartient le compte (optionnel)"
              >
                <Select
                  placeholder="Sélectionnez une classe (optionnel)"
                  allowClear disabled={!selectedFramework}
                  showSearch optionFilterProp="label"
                  options={groups.map((g) => ({ label: `${g.code} – ${g.name}`, value: g.id }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Paramètres comptables ──────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Paramètres comptables</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="currency" label="Devise" tooltip="Devise du compte (optionnel)">
                <Select
                  placeholder="Devise par défaut"
                  allowClear showSearch optionFilterProp="label"
                  options={currencies.map((c) => ({ label: `${c.code} – ${c.nom || c.name}`, value: c.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="reconcile" label="Compte lettrable" valuePropName="checked"
                tooltip="Autorise le lettrage des écritures sur ce compte"
              >
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="company" label="Entité spécifique" tooltip="Laissez vide pour un compte partagé entre toutes les entités">
            <Select
              placeholder="Toutes les entités (partagé)"
              allowClear showSearch optionFilterProp="label"
              options={entities.map((e) => ({ label: e.name || e.raison_sociale, value: e.id }))}
            />
          </Form.Item>

          {/* ── Notes ─────────────────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Notes</Divider>

          <Form.Item name="note" label="Notes / Description">
            <TextArea rows={3} placeholder="Notes ou description du compte (utilisation, remarques…)" showCount maxLength={1000} />
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