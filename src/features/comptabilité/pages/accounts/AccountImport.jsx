// src/features/comptabilite/pages/accounts/AccountImport.jsx
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  InboxOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Divider,
  message,
  Progress,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

const AccountImport = () => {
  const navigate = useNavigate();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [validData, setValidData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  // Configuration de l'upload
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.xlsx,.xls',
    beforeUpload: (file) => {
      handleFileUpload(file);
      return false; // Empêcher l'upload automatique
    },
    onRemove: () => {
      setFileData([]);
      setValidData([]);
      setErrors([]);
      setCurrentStep(0);
    },
  };

  const handleFileUpload = async (file) => {
    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Lire la première feuille
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          message.error('Le fichier est vide');
          return;
        }

        setFileData(jsonData);
        setCurrentStep(1);
        message.success(`${jsonData.length} ligne(s) détectée(s)`);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      message.error('Erreur lors de la lecture du fichier');
      console.error(error);
    }
  };

  const validateData = () => {
    if (!selectedFramework) {
      message.error('Veuillez sélectionner un référentiel comptable');
      return;
    }

    const valid = [];
    const errorsList = [];

    fileData.forEach((row, index) => {
      const errors = [];

      // Validation du code (obligatoire)
      if (!row.code || String(row.code).trim() === '') {
        errors.push('Code manquant');
      }

      // Validation du nom (obligatoire)
      if (!row.name || String(row.name).trim() === '') {
        errors.push('Nom manquant');
      }

      // Validation du type (obligatoire)
      if (!row.type) {
        errors.push('Nature (type) manquante');
      }

      if (errors.length > 0) {
        errorsList.push({
          line: index + 2, // +2 car index commence à 0 et ligne 1 = header
          code: row.code,
          errors: errors.join(', '),
        });
      } else {
        valid.push({
          framework: selectedFramework,
          code: String(row.code).trim(),
          name: String(row.name).trim(),
          type: row.type,
          group: row.group || null,
          opening_balance: parseFloat(row.opening_balance || 0),
          reconcile: row.reconcile === 'true' || row.reconcile === true || row.reconcile === 1,
          active: row.active !== 'false' && row.active !== false && row.active !== 0,
          note: row.note || '',
        });
      }
    });

    setValidData(valid);
    setErrors(errorsList);
    setCurrentStep(2);

    if (errorsList.length > 0) {
      message.warning(`${errorsList.length} erreur(s) détectée(s)`);
    } else {
      message.success(`${valid.length} compte(s) prêt(s) à être importé(s)`);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);

    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Import par lots
      const batchSize = 10;
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (account) => {
            try {
              await axios.post('/api/compta/accounts/', account);
              results.success++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                code: account.code,
                error: error.response?.data?.detail || 'Erreur inconnue',
              });
            }
          })
        );

        // Mise à jour de la progression
        setImportProgress(Math.round(((i + batch.length) / validData.length) * 100));
      }

      setImportResult(results);
      setCurrentStep(3);

      if (results.failed === 0) {
        message.success(`${results.success} compte(s) importé(s) avec succès`);
      } else {
        message.warning(
          `${results.success} compte(s) importé(s), ${results.failed} échec(s)`
        );
      }
    } catch (error) {
      message.error('Erreur lors de l\'import');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const errorColumns = [
    { title: 'Ligne', dataIndex: 'line', key: 'line', width: 80 },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Erreurs', dataIndex: 'errors', key: 'errors' },
  ];

  const previewColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Nature (ID)', dataIndex: 'type', key: 'type', width: 100 },
    {
      title: 'Solde ouverture',
      dataIndex: 'opening_balance',
      key: 'opening_balance',
      width: 150,
      render: (val) => parseFloat(val || 0).toFixed(2),
    },
    {
      title: 'Lettrable',
      dataIndex: 'reconcile',
      key: 'reconcile',
      width: 100,
      render: (val) => (val ? <Tag color="success">Oui</Tag> : <Tag>Non</Tag>),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/comptabilite/accounts')}
        style={{ marginBottom: '16px' }}
      >
        Retour aux comptes
      </Button>

      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}
      >
        <Title level={2}>Import de comptes comptables</Title>
        <Paragraph type="secondary">
          Importez vos comptes depuis un fichier CSV ou Excel. Le fichier doit contenir les
          colonnes suivantes :
        </Paragraph>

        <Alert
          message="Format du fichier"
          description={
            <div>
              <strong>Colonnes obligatoires :</strong>
              <ul>
                <li>
                  <code>code</code> : Code du compte (ex: 411001)
                </li>
                <li>
                  <code>name</code> : Libellé du compte
                </li>
                <li>
                  <code>type</code> : ID de la nature du compte
                </li>
              </ul>
              <strong>Colonnes optionnelles :</strong>
              <ul>
                <li>
                  <code>group</code> : ID de la classe
                </li>
                <li>
                  <code>opening_balance</code> : Solde d'ouverture (nombre décimal)
                </li>
                <li>
                  <code>reconcile</code> : Lettrable (true/false)
                </li>
                <li>
                  <code>active</code> : Actif (true/false, par défaut true)
                </li>
                <li>
                  <code>note</code> : Notes/description
                </li>
              </ul>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Steps current={currentStep} style={{ marginBottom: '32px' }}>
          <Step title="Fichier" description="Chargement" />
          <Step title="Référentiel" description="Sélection" />
          <Step title="Validation" description="Vérification" />
          <Step title="Import" description="Finalisation" />
        </Steps>

        {/* Étape 0: Upload du fichier */}
        {currentStep === 0 && (
          <Dragger {...uploadProps} style={{ padding: '40px' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 64, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              Cliquez ou glissez-déposez votre fichier ici
            </p>
            <p className="ant-upload-hint">
              Formats acceptés : CSV, XLSX, XLS
            </p>
          </Dragger>
        )}

        {/* Étape 1: Sélection du référentiel */}
        {currentStep === 1 && (
          <div>
            <Alert
              message={`${fileData.length} ligne(s) chargée(s)`}
              type="success"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Sélectionnez le référentiel comptable :
              </Text>
              <Select
                style={{ width: '100%' }}
                size="large"
                placeholder="Choisissez le plan comptable"
                onChange={(value) => setSelectedFramework(value)}
                value={selectedFramework}
              >
                {frameworks.map((fw) => (
                  <Option key={fw.id} value={fw.id}>
                    {fw.code} - {fw.name}
                  </Option>
                ))}
              </Select>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={validateData}
              disabled={!selectedFramework}
            >
              Valider et continuer
            </Button>
          </div>
        )}

        {/* Étape 2: Validation */}
        {currentStep === 2 && (
          <div>
            {errors.length > 0 && (
              <>
                <Alert
                  message={`${errors.length} erreur(s) détectée(s)`}
                  description="Corrigez les erreurs dans votre fichier et réessayez"
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginBottom: '16px' }}
                />
                <Table
                  columns={errorColumns}
                  dataSource={errors}
                  rowKey="line"
                  pagination={false}
                  style={{ marginBottom: '24px' }}
                />
              </>
            )}

            {validData.length > 0 && (
              <>
                <Alert
                  message={`${validData.length} compte(s) valide(s)`}
                  description="Aperçu des comptes à importer"
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  style={{ marginBottom: '16px' }}
                />
                <Table
                  columns={previewColumns}
                  dataSource={validData.slice(0, 10)}
                  rowKey="code"
                  pagination={false}
                  style={{ marginBottom: '16px' }}
                />
                {validData.length > 10 && (
                  <Text type="secondary">
                    ... et {validData.length - 10} autre(s) compte(s)
                  </Text>
                )}
              </>
            )}

            <Divider />

            <Space>
              <Button onClick={() => setCurrentStep(1)}>Retour</Button>
              <Button
                type="primary"
                size="large"
                icon={<CloudUploadOutlined />}
                onClick={handleImport}
                disabled={validData.length === 0}
                loading={importing}
              >
                Lancer l'import
              </Button>
            </Space>
          </div>
        )}

        {/* Étape 3: Import en cours */}
        {currentStep === 3 && importing && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Progress
              type="circle"
              percent={importProgress}
              status="active"
              style={{ marginBottom: '24px' }}
            />
            <div>
              <Text strong>Import en cours...</Text>
            </div>
          </div>
        )}

        {/* Étape 3: Résultat */}
        {currentStep === 3 && !importing && importResult && (
          <div>
            <Alert
              message="Import terminé"
              description={
                <div>
                  <div>✅ {importResult.success} compte(s) importé(s) avec succès</div>
                  {importResult.failed > 0 && (
                    <div style={{ color: '#ff4d4f' }}>
                      ❌ {importResult.failed} échec(s)
                    </div>
                  )}
                </div>
              }
              type={importResult.failed === 0 ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: '24px' }}
            />

            {importResult.errors.length > 0 && (
              <>
                <Title level={4}>Erreurs rencontrées :</Title>
                <Table
                  columns={[
                    { title: 'Code', dataIndex: 'code', key: 'code' },
                    { title: 'Erreur', dataIndex: 'error', key: 'error' },
                  ]}
                  dataSource={importResult.errors}
                  rowKey="code"
                  pagination={false}
                  style={{ marginBottom: '24px' }}
                />
              </>
            )}

            <Space>
              <Button type="primary" onClick={() => navigate('/comptabilite/accounts')}>
                Retour aux comptes
              </Button>
              <Button
                onClick={() => {
                  setCurrentStep(0);
                  setFileData([]);
                  setValidData([]);
                  setErrors([]);
                  setImportResult(null);
                }}
              >
                Nouvel import
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountImport;