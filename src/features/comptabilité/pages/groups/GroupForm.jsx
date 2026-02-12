// src/features/comptabilite/pages/groups/GroupForm.jsx
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
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const GroupForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const { createGroup, updateGroup, fetchGroupById, groups, fetchGroups } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);

  useEffect(() => {
    loadFormData();
  }, [id]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      await fetchFrameworks();

      if (id) {
        const group = await fetchGroupById(id);
        setSelectedFramework(group.framework);
        form.setFieldsValue({
          framework: group.framework,
          code: group.code,
          name: group.name,
          code_prefix_start: group.code_prefix_start,
          code_prefix_end: group.code_prefix_end,
          sequence: group.sequence,
          parent: group.parent,
          note: group.note,
        });
        // Charger les groupes du même framework pour le parent
        await fetchGroups({ framework: group.framework });
      }
    } catch (error) {
      message.error('Impossible de charger les données');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFrameworkChange = async (frameworkId) => {
    setSelectedFramework(frameworkId);
    form.setFieldValue('parent', null);
    await fetchGroups({ framework: frameworkId });
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (id) {
        await updateGroup(id, values);
        message.success('Classe modifiée avec succès');
      } else {
        await createGroup(values);
        message.success('Classe créée avec succès');
      }
      navigate('/comptabilite/groups');
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Erreur lors de la sauvegarde';
      message.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les groupes parents (exclure le groupe actuel et ses enfants)
  const availableParents = groups.filter((g) => g.id !== parseInt(id));

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}
      >
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0 }}>
            {id ? 'Modifier la classe de comptes' : 'Créer une nouvelle classe'}
          </Title>
          <Text type="secondary">
            {id
              ? 'Modifiez les informations de la classe'
              : 'Définissez une nouvelle classe ou groupe de comptes'}
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
                  label="Code"
                  rules={[
                    { required: true, message: 'Le code est obligatoire' },
                    { max: 8, message: 'Maximum 8 caractères' },
                  ]}
                  tooltip="Code de la classe (ex: 1, 2, 21, 211)"
                >
                  <Input placeholder="ex: 1" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  name="sequence"
                  label="Ordre d'affichage"
                  tooltip="Ordre de tri dans la liste"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="name"
              label="Nom de la classe"
              rules={[
                { required: true, message: 'Le nom est obligatoire' },
                { max: 255, message: 'Maximum 255 caractères' },
              ]}
            >
              <Input placeholder="ex: Comptes de capitaux" />
            </Form.Item>

            <Divider orientation="left">Hiérarchie</Divider>

            <Form.Item
              name="parent"
              label="Classe parente"
              tooltip="Laissez vide pour une classe racine"
            >
              <Select
                placeholder="Aucune (classe racine)"
                allowClear
                disabled={!selectedFramework}
              >
                {availableParents.map((group) => (
                  <Option key={group.id} value={group.id}>
                    {group.code} - {group.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider orientation="left">Plage de comptes</Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="code_prefix_start"
                  label="Début de plage"
                  tooltip="Premier code de compte de cette classe (ex: 10)"
                >
                  <Input placeholder="ex: 10" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="code_prefix_end"
                  label="Fin de plage"
                  tooltip="Dernier code de compte de cette classe (ex: 19)"
                >
                  <Input placeholder="ex: 19" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Informations complémentaires</Divider>

            <Form.Item name="note" label="Notes / Description">
              <TextArea
                rows={3}
                placeholder="Description de la classe, remarques particulières..."
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
                  onClick={() => navigate('/comptabilite/groups')}
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

export default GroupForm;