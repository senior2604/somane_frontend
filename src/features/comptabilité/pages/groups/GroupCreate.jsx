// src/features/comptabilite/pages/groups/GroupCreate.jsx
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, message, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';
import GroupFormFields from './components/GroupFormFields';

const { Title, Text } = Typography;
const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

const GroupCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const { createGroup, fetchGroups, groups } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await fetchFrameworks();

        // Résolution du framework initial (état de navigation > sessionStorage)
        const fromState = location.state?.frameworkId;
        const fromSession = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
        const fwId = fromState ?? (fromSession ? parseInt(fromSession) : null);

        if (fwId) {
          setSelectedFramework(fwId);
          form.setFieldValue('framework', fwId);
          await fetchGroups({ framework: fwId });
        }
      } catch {
        message.error('Erreur lors du chargement initial');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // Une seule fois au montage

  const handleFrameworkChange = async (frameworkId) => {
    setSelectedFramework(frameworkId);
    if (frameworkId) {
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
      form.setFieldValue('parent', null);
      await fetchGroups({ framework: frameworkId });
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await createGroup({
        ...values,
        company: values.company || [],
        excluded_account_ids: values.excluded_account_ids || [],
      });
      message.success('Classe créée avec succès');
      navigate('/comptabilite/groups');
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, errors]) => {
          message.error(
            `${field} : ${Array.isArray(errors) ? errors.join(', ') : String(errors)}`
          );
        });
      } else {
        message.error(error.message || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 8 }}
        loading={loading && !frameworks.length}
      >
        <div style={{ marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0 }}>
            Créer une nouvelle classe de comptes
          </Title>
          <Text type="secondary">
            Définissez une nouvelle classe ou groupe de comptes dans le plan comptable
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          size="large"
        >
          <GroupFormFields
            frameworks={frameworks}
            groups={groups}
            selectedFramework={selectedFramework}
            onFrameworkChange={handleFrameworkChange}
            disableFramework={false}
          />

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
                Créer la classe
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
      </Card>
    </div>
  );
};

export default GroupCreate;