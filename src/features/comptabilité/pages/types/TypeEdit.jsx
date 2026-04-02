// src/features/comptabilité/pages/types/TypeCreate.jsx
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
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { TextArea } = Input;
const { Title, Text } = Typography;

const FRAMEWORK_SESSION_KEY = 'type_list_selected_framework';

const TypeCreate = () => {
  const [form]   = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const { createType }                 = useTypeStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [loading, setLoading]                     = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);

  // Listes dépendantes du framework
  const [groups,     setGroups]     = useState([]); // AccountGroup → internal_group
  const [parentTypes, setParentTypes] = useState([]); // AccountAccountType → parent

  // ── Chargement des groupes et types du framework ────────────────
  const loadFrameworkData = useCallback(async (fwId) => {
    try {
      const [groupsRes, typesRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: fwId } }),
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES,  { params: { framework: fwId } }),
      ]);
      setGroups(groupsRes.data.results      || groupsRes.data);
      setParentTypes(typesRes.data.results  || typesRes.data);
    } catch { console.error('Erreur chargement groupes/types'); }
  }, []);

  // ── Init ────────────────────────────────────────────────────────
  const initPage = useCallback(async () => {
    setLoading(true);
    try {
      await fetchFrameworks();

      const fromState   = location.state?.frameworkId ?? null;
      const fromSession = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
      const fwId        = fromState ?? (fromSession ? parseInt(fromSession, 10) : null);

      if (fwId) {
        setSelectedFramework(fwId);
        form.setFieldValue('framework', fwId);
        await loadFrameworkData(fwId);
      }

      // Valeurs par défaut
      form.setFieldsValue({
        active:                     true,
        include_in_opening_balance: true,
        closing_behavior:           'none',
        default_balance_type:       'debit',
        allow_reconciliation:       false,
        default_debit:              true,   // cohérent avec default_balance_type = debit
        default_credit:             false,
      });
    } catch {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { initPage(); }, [initPage]);

  // ── Changement de framework ─────────────────────────────────────
  const handleFrameworkChange = async (fwId) => {
    setSelectedFramework(fwId);
    form.setFieldsValue({ internal_group: null, parent: null });
    if (fwId) {
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));
      await loadFrameworkData(fwId);
    }
  };

  // ── Synchronisation debit/credit ────────────────────────────────
  // Quand on change le type de solde → coche automatiquement le bon Switch
  const handleBalanceTypeChange = (value) => {
    if (value === 'debit') {
      form.setFieldsValue({ default_debit: true, default_credit: false });
    } else if (value === 'credit') {
      form.setFieldsValue({ default_debit: false, default_credit: true });
    }
  };

  // Quand on coche manuellement "débiteur" → met à jour le select
  const handleDefaultDebitChange = (checked) => {
    if (checked) {
      form.setFieldsValue({ default_balance_type: 'debit', default_credit: false });
    }
  };

  // Quand on coche manuellement "créditeur" → met à jour le select
  const handleDefaultCreditChange = (checked) => {
    if (checked) {
      form.setFieldsValue({ default_balance_type: 'credit', default_debit: false });
    }
  };

  // ── Soumission ──────────────────────────────────────────────────
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await createType(values);
      message.success('Nature créée avec succès');
      navigate('/comptabilite/types');
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
          <Title level={3} style={{ margin: 0 }}>Créer une nouvelle nature de compte</Title>
          <Text type="secondary">Définissez un nouveau type/nature de compte comptable</Text>
        </div>

        {selectedFw && (
          <Alert
            type="info" showIcon style={{ marginBottom: 24 }}
            message={
              <span>
                Référentiel actif :{' '}
                <Text strong style={{ color: '#1677ff' }}>{selectedFw.code} – {selectedFw.name}</Text>
              </span>
            }
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional" size="large">

          {/* ── Informations générales ─────────────────────────── */}
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
            <Col xs={24} md={12}>
              <Form.Item
                name="code" label="Code"
                rules={[
                  { required: true, message: 'Le code est obligatoire' },
                  { max: 32, message: 'Maximum 32 caractères' },
                ]}
                tooltip="Code de la nature (ex : IMMO, TIERS-CL, BANQUE)"
              >
                <Input placeholder="ex : IMMO" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name" label="Nom de la nature"
            rules={[
              { required: true, message: 'Le nom est obligatoire' },
              { max: 255, message: 'Maximum 255 caractères' },
            ]}
          >
            <Input placeholder="ex : Immobilisations" />
          </Form.Item>

          {/* ── Classification ──────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Classification</Divider>

          <Row gutter={16}>
            {/* internal_group = FK vers AccountGroup du même framework */}
            <Col xs={24} md={12}>
              <Form.Item
                name="internal_group" label="Groupe / Classe principale"
                tooltip="Classe comptable à laquelle cette nature est rattachée"
              >
                <Select
                  placeholder={selectedFramework ? 'Sélectionnez un groupe…' : "Sélectionnez d'abord un référentiel"}
                  allowClear
                  disabled={!selectedFramework}
                  showSearch optionFilterProp="label"
                  options={groups.map((g) => ({
                    label: `${g.code} – ${g.name}`,
                    value: g.id,
                  }))}
                />
              </Form.Item>
            </Col>

            {/* parent = FK vers AccountAccountType (self) du même framework */}
            <Col xs={24} md={12}>
              <Form.Item
                name="parent" label="Nature parente"
                tooltip="Hiérarchie optionnelle entre natures de comptes"
              >
                <Select
                  placeholder={selectedFramework ? 'Aucune (niveau racine)' : "Sélectionnez d'abord un référentiel"}
                  allowClear
                  disabled={!selectedFramework}
                  showSearch optionFilterProp="label"
                  options={parentTypes.map((t) => ({
                    label: `${t.code} – ${t.name}`,
                    value: t.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Comportement comptable ──────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Comportement comptable</Divider>

          <Alert
            type="info" showIcon style={{ marginBottom: 16 }}
            message="Le type de solde par défaut coche automatiquement le sens habituel (débiteur/créditeur)."
          />

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="default_balance_type" label="Type de solde par défaut"
                rules={[{ required: true }]}
                tooltip="Détermine si ce compte est naturellement débiteur ou créditeur"
              >
                <Select
                  onChange={handleBalanceTypeChange}
                  options={[
                    { label: 'Débit',  value: 'debit' },
                    { label: 'Crédit', value: 'credit' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="default_debit" label="Généralement débiteur"
                valuePropName="checked"
                tooltip="Le compte porte habituellement un solde débiteur"
              >
                <Switch onChange={handleDefaultDebitChange} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="default_credit" label="Généralement créditeur"
                valuePropName="checked"
                tooltip="Le compte porte habituellement un solde créditeur"
              >
                <Switch onChange={handleDefaultCreditChange} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="allow_reconciliation" label="Autorise le lettrage"
                valuePropName="checked"
                tooltip="Les comptes de ce type peuvent être lettrés"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="include_in_opening_balance" label="Bilan d'ouverture" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="active" label="Statut" valuePropName="checked">
                <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="closing_behavior" label="Comportement à la clôture"
            tooltip="Définit comment les soldes sont traités en fin d'exercice"
          >
            <Select options={[
              { label: 'Aucun',           value: 'none' },
              { label: 'Report à nouveau',value: 'carry_forward' },
            ]} />
          </Form.Item>

          {/* ── Notes ───────────────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>Notes</Divider>

          <Form.Item name="note" label="Description fonctionnelle">
            <TextArea rows={3} placeholder="Description fonctionnelle, cas d'usage…" showCount maxLength={1000} />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" loading={loading}>
                Créer la nature
              </Button>
              <Button size="large" icon={<CloseOutlined />} onClick={() => navigate('/comptabilite/types')}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TypeCreate;