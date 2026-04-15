// src/features/comptabilite/pages/groups/GroupEdit.jsx
import { CloseOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, message, Space, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';
import GroupFormFields from './components/GroupFormFields';

const { Title, Text } = Typography;
const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

const GroupEdit = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const { updateGroup, fetchGroupById, fetchGroups, groups } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  // États locaux
  const [pageLoading, setPageLoading] = useState(true);   // chargement initial complet
  const [saving, setSaving] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [groupData, setGroupData] = useState(null);       // données brutes du groupe

  /**
   * STRATÉGIE EDIT :
   * 1. Charger frameworks ET groupe en parallèle
   * 2. Une fois les deux disponibles → setFieldsValues
   * Cela évite le bug où le Select framework n'a pas encore ses options
   * quand on essaie de sélectionner une valeur.
   */
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        // Chargement parallèle pour gagner du temps
        const [, group] = await Promise.all([
          fetchFrameworks(),
          fetchGroupById(id),
        ]);

        const fwId = group.framework;
        setSelectedFramework(fwId);
        setGroupData(group);
        sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));

        // Charger les groupes du même framework (pour le select parent)
        await fetchGroups({ framework: fwId });

        // À ce stade frameworks ET groups sont chargés → setFieldsValues fonctionne
        form.setFieldsValue({
          framework:            fwId,
          code:                 group.code,
          name:                 group.name,
          code_prefix_start:    group.code_prefix_start || '',
          code_prefix_end:      group.code_prefix_end   || '',
          sequence:             group.sequence ?? 0,
          parent:               group.parent   || null,
          company:              Array.isArray(group.company)
                                  ? group.company
                                  : [],
          excluded_account_ids: Array.isArray(group.excluded_account_ids)
                                  ? group.excluded_account_ids
                                  : [],
          note:                 group.note || '',
        });
      } catch (error) {
        message.error('Impossible de charger la classe à modifier');
        console.error(error);
        navigate('/comptabilite/groups');
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [id]); // Relancer si l'id change (navigation entre éditions)

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await updateGroup(id, {
        ...values,
        company:              values.company              || [],
        excluded_account_ids: values.excluded_account_ids || [],
      });
      message.success('Classe modifiée avec succès');
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
        message.error(error.message || 'Erreur lors de la modification');
      }
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
          padding: 24,
        }}
      >
        <Spin size="large" tip="Chargement de la classe…" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 8 }}
      >
        <div
          style={{
            marginBottom: 28,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Modifier la classe de comptes
            </Title>
            <Text type="secondary">
              {groupData
                ? `${groupData.code} – ${groupData.name}`
                : 'Modifiez les informations de la classe'}
            </Text>
          </div>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/comptabilite/groups/${id}`)}
          >
            Voir le détail
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          size="large"
        >
          {/* En mode édition : référentiel verrouillé (disableFramework=true) */}
          <GroupFormFields
            frameworks={frameworks}
            groups={groups}
            selectedFramework={selectedFramework}
            onFrameworkChange={undefined}   // pas de changement de fw en édition
            disableFramework={true}
            editId={id}
          />

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                size="large"
                loading={saving}
              >
                Mettre à jour
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

export default GroupEdit;