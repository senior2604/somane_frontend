// src/features/comptabilite/pages/types/TypeForm.jsx
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
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
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const TypeForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const { createType, updateType, fetchTypeById } = useTypeStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFormData();
  }, [id]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      await fetchFrameworks();

      if (id) {
        const type = await fetchTypeById(id);
        form.setFieldsValue({
          framework: type.framework,
          code: type.code,
          name: type.name,
          internal_group: type.internal_group,
          internal_type: type.internal_type,
          default_debit: type.default_debit,
          default_credit: type.default_credit,
          default_balance_type: type.default_balance_type,
          allow_reconciliation: type.allow_reconciliation,
          include_in_opening_balance: type.include_in_opening_balance,
          closing_behavior: type.closing_behavior,
          active: type.active !== false,
          note: type.note,
        });
      } else {
        form.setFieldsValue({
          active: true,
          include_in_opening_balance: true,
          closing_behavior: 'none',
          default_balance_type: 'debit',
        });
      }
    } catch (error) {
      message.error('Impossible de charger les données');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (id) {
        await updateType(id, values);
        message.success('Nature modifiée avec succès');
      } else {
        await createType(values);
        message.success('Nature créée avec succès');
      }
      navigate('/comptabilite/types');
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Erreur lors de la sauvegarde';
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
            {id ? 'Modifier la nature de compte' : 'Créer une nouvelle nature'}
          </Title>
          <Text type="secondary">
            {id
              ? 'Modifiez les informations de la nature de compte'
              : 'Définissez une nouvelle nature/type de compte'}
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
                  <Select placeholder="Sélectionnez un plan comptable" disabled={!!id}>
                    {frameworks.map((fw) => (
                      <Option key={fw.id} value={fw.id}>
                        {fw.code} - {fw.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="code"
                  label="Code"
                  rules={[
                    { required: true, message: 'Le code est obligatoire' },
                    { max: 32, message: 'Maximum 32 caractères' },
                  ]}
                  tooltip="Code de la nature (ex: IMMO, TIERS-CL, BANQUE)"
                >
                  <Input placeholder="ex: IMMO" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="name"
              label="Nom de la nature"
              rules={[
                { required: true, message: 'Le nom est obligatoire' },
                { max: 255, message: 'Maximum 255 caractères' },
              ]}
            >
              <Input placeholder="ex: Immobilisations" />
            </Form.Item>

            <Divider orientation="left">Classification</Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="internal_group"
                  label="Groupe interne"
                  rules={[{ required: true, message: 'Sélectionnez un groupe' }]}
                  tooltip="Classification financière du compte"
                >
                  <Select placeholder="Sélectionnez un groupe">
                    <Option value="asset">Actif</Option>
                    <Option value="liability">Passif</Option>
                    <Option value="equity">Capitaux propres</Option>
                    <Option value="income">Produits</Option>
                    <Option value="expense">Charges</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="internal_type"
                  label="Type interne"
                  tooltip="Sous-classification (optionnel)"
                >
                  <Input placeholder="ex: amortissement, provision" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Comportement comptable</Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="default_balance_type"
                  label="Type de solde par défaut"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="debit">Débit</Option>
                    <Option value="credit">Crédit</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="default_debit"
                  label="Généralement débiteur"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="default_credit"
                  label="Généralement créditeur"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="allow_reconciliation"
                  label="Autorise le lettrage"
                  valuePropName="checked"
                  tooltip="Les comptes de ce type peuvent être lettrés"
                >
                  <Switch />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="include_in_opening_balance"
                  label="Apparaît dans le bilan d'ouverture"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="closing_behavior"
              label="Comportement à la clôture"
              tooltip="Définit comment les soldes sont traités en fin d'exercice"
            >
              <Select>
                <Option value="none">Aucun</Option>
                <Option value="carry_forward">Report à nouveau</Option>
                <Option value="close">Clôture</Option>
              </Select>
            </Form.Item>

            <Divider orientation="left">Informations complémentaires</Divider>

            <Form.Item name="note" label="Notes / Description">
              <TextArea
                rows={3}
                placeholder="Description de la nature, cas d'usage, remarques..."
              />
            </Form.Item>

            <Form.Item
              name="active"
              label="Statut"
              valuePropName="checked"
              tooltip="Seules les natures actives peuvent être utilisées"
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
                  onClick={() => navigate('/comptabilite/types')}
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

export default TypeForm;