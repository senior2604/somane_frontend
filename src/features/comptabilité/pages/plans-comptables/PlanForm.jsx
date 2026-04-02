// src/features/comptabilité/pages/plans-comptables/PlanForm.jsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Switch, Button, message, Spin, Alert } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const PlanForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams(); // null si création
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countries, setCountries] = useState([]);
  const [entities, setEntities] = useState([]);

  // Charger les pays et entités au montage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Charger les pays
        const countriesRes = await axios.get('/api/pays/');
        setCountries(countriesRes.data.results || countriesRes.data);

        // Charger les entités
        const entitiesRes = await axios.get('/api/entites/');
        setEntities(entitiesRes.data.results || entitiesRes.data);
      } catch (err) {
        setError('Impossible de charger les données (pays/entités)');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Charger le plan existant si édition
    if (id) {
      setLoading(true);
      axios.get(`/api/compta/frameworks/${id}/`)
        .then(res => {
          const data = res.data;
          form.setFieldsValue({
            code: data.code,
            name: data.name,
            version: data.version,
            country: data.country,
            shared: data.company?.length === 0,
            company: data.company || [],
            description: data.description,
          });
        })
        .catch(() => message.error('Impossible de charger ce plan'))
        .finally(() => setLoading(false));
    } else {
      form.resetFields();
      form.setFieldsValue({ shared: true });
    }
  }, [id, form]);

  const onFinish = async (values) => {
    // Si partagé → on envoie company vide
    if (values.shared) {
      values.company = [];
    }

    setLoading(true);
    try {
      if (id) {
        await axios.put(`/api/compta/frameworks/${id}/`, values);
        message.success('Plan modifié avec succès');
      } else {
        await axios.post('/api/compta/frameworks/', values);
        message.success('Plan créé avec succès');
      }
      navigate('/comptabilite/plans');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Erreur sauvegarde';
      message.error(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '32px', fontSize: '28px', fontWeight: 'bold' }}>
          {id ? 'Modifier le plan comptable' : 'Créer un nouveau plan comptable'}
        </h1>

        {error && <Alert message="Erreur" description={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

        <Spin spinning={loading}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            {/* Code */}
            <Form.Item name="code" label="Code du plan" rules={[{ required: true, message: 'Code obligatoire' }]}>
              <Input size="large" placeholder="ex: SYSCOHADA, PCG, IFRS" />
            </Form.Item>

            {/* Nom */}
            <Form.Item name="name" label="Nom complet" rules={[{ required: true, message: 'Nom obligatoire' }]}>
              <Input size="large" placeholder="ex: SYSCOHADA Révisé 2018" />
            </Form.Item>

            {/* Version */}
            <Form.Item name="version" label="Version">
              <Input size="large" placeholder="ex: 2018, 2020, v1.2" />
            </Form.Item>

            {/* Pays (chargé depuis la base) */}
            <Form.Item name="country" label="Pays principal">
              <Select size="large" placeholder="Sélectionner un pays" allowClear showSearch>
                {countries.map(country => (
                  <Option key={country.id} value={country.id}>
                    {country.nom || country.name || `Pays ${country.id}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Partagé ou spécifique */}
            <Form.Item
              name="shared"
              label="Ce plan comptable est-il partagé par toutes les entités de l'entreprise ?"
              valuePropName="checked"
            >
              <Switch size="large" />
            </Form.Item>

            {/* Entités spécifiques */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.shared !== curr.shared}>
              {({ getFieldValue }) =>
                !getFieldValue('shared') && (
                  <Form.Item
                    name="company"
                    label="Entités concernées par ce plan"
                    rules={[{ required: true, message: 'Sélectionnez au moins une entité' }]}
                  >
                    <Select
                      mode="multiple"
                      size="large"
                      placeholder="Sélectionnez les entités/compagnies qui utilisent ce plan"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {entities.map(ent => (
                        <Option key={ent.id} value={ent.id} label={ent.name || ent.raison_sociale || `Entité ${ent.id}`}>
                          {ent.name || ent.raison_sociale || `Entité ${ent.id}`}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>

            {/* Description */}
            <Form.Item name="description" label="Description / Notes">
              <TextArea rows={5} placeholder="Description détaillée du plan, version, spécificités, remarques..." />
            </Form.Item>

            {/* Boutons */}
            <Form.Item style={{ marginTop: '32px' }}>
              <Button type="primary" htmlType="submit" size="large" style={{ width: '180px' }}>
                {id ? 'Modifier' : 'Créer'}
              </Button>
              <Button 
                size="large" 
                style={{ marginLeft: '12px', width: '180px' }} 
                onClick={() => navigate('/comptabilite/plans')}
              >
                Annuler
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </div>
    </div>
  );
};

export default PlanForm;