// src/features/comptabilite/pages/groups/components/GroupFormFields.jsx
import {
  Alert,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Typography,
} from 'antd';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

/**
 * Champs partagés entre GroupCreate et GroupEdit.
 * Props :
 *  - frameworks       : liste des référentiels
 *  - groups           : liste des groupes du framework sélectionné (pour le parent)
 *  - selectedFramework: id du framework courant
 *  - onFrameworkChange: callback quand on change de framework (Create seulement)
 *  - disableFramework : true en mode Edit (le référentiel est verrouillé)
 *  - editId           : id du groupe en cours d'édition (pour exclure du select parent)
 */
const GroupFormFields = ({
  frameworks = [],
  groups = [],
  selectedFramework = null,
  onFrameworkChange,
  disableFramework = false,
  editId = null,
}) => {
  const availableParents = groups.filter(
    (g) => editId === null || g.id !== parseInt(editId)
  );

  const selectedFw = frameworks.find((f) => f.id === selectedFramework);

  return (
    <>
      {/* Bandeau référentiel actif */}
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
              {selectedFw.version && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  &nbsp;(v{selectedFw.version})
                </Text>
              )}
            </span>
          }
        />
      )}

      {/* ── Référentiel & Identification ─────────────────────────── */}
      <Divider orientation="left" orientationMargin={0}>
        Référentiel & Identification
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="framework"
            label="Référentiel comptable"
            rules={[{ required: true, message: 'Sélectionnez un référentiel' }]}
            tooltip="Plan comptable auquel appartient cette classe (SYSCOHADA, PCGFR…)"
          >
            <Select
              placeholder="Sélectionnez un plan comptable…"
              onChange={onFrameworkChange}
              disabled={disableFramework}
              showSearch
              optionFilterProp="label"
              options={frameworks.map((fw) => ({
                label: `${fw.code} – ${fw.name}`,
                value: fw.id,
              }))}
            />
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
            tooltip="Code de la classe (ex : 1, 2, 21, 211)"
          >
            <Input
              placeholder="ex : 1"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            name="sequence"
            label="Ordre d'affichage"
            tooltip="Numéro de tri dans la liste (0 = premier)"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
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
        <Input placeholder="ex : Comptes de capitaux" />
      </Form.Item>

      {/* ── Hiérarchie ──────────────────────────────────────────── */}
      <Divider orientation="left" orientationMargin={0}>
        Hiérarchie
      </Divider>

      <Form.Item
        name="parent"
        label="Classe parente"
        tooltip="Laissez vide pour une classe racine (premier niveau)"
      >
        <Select
          placeholder={
            selectedFramework
              ? 'Aucune (classe racine)'
              : 'Sélectionnez d\'abord un référentiel'
          }
          allowClear
          disabled={!selectedFramework}
          showSearch
          optionFilterProp="label"
          options={availableParents.map((g) => ({
            label: `${g.code} – ${g.name}`,
            value: g.id,
          }))}
        />
      </Form.Item>

      {/* ── Plage de comptes ─────────────────────────────────────── */}
      <Divider orientation="left" orientationMargin={0}>
        Plage de comptes
      </Divider>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="La plage détermine quels comptes sont rattachés automatiquement à cette classe via leur préfixe de code."
      />

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="code_prefix_start"
            label="Début de plage"
            tooltip="Premier code de compte inclus dans cette classe (ex : 10)"
          >
            <Input placeholder="ex : 10" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            name="code_prefix_end"
            label="Fin de plage"
            tooltip="Dernier code de compte inclus dans cette classe (ex : 19)"
          >
            <Input placeholder="ex : 19" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Col>
      </Row>

      {/* Comptes exclus — brancher accountStore quand disponible */}
      <Form.Item
        name="excluded_account_ids"
        label="Comptes exclus de la plage"
        tooltip="Comptes qui, bien que dans la plage, ne doivent PAS être rattachés à cette classe"
      >
        <Select
          mode="multiple"
          placeholder="Aucun compte exclu"
          allowClear
          disabled={!selectedFramework}
          optionFilterProp="label"
          options={[]}
          // TODO: brancher sur accountStore filtré par framework
        />
      </Form.Item>

      {/* ── Périmètre ────────────────────────────────────────────── */}
      <Divider orientation="left" orientationMargin={0}>
        Périmètre
      </Divider>

      <Form.Item
        name="company"
        label="Sociétés concernées"
        tooltip="Laissez vide si la classe s'applique à toutes les sociétés"
      >
        <Select
          mode="multiple"
          placeholder="Toutes les sociétés (par défaut)"
          allowClear
          optionFilterProp="label"
          options={[]}
          // TODO: brancher sur entiteStore
        />
      </Form.Item>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <Divider orientation="left" orientationMargin={0}>
        Notes
      </Divider>

      <Form.Item name="note" label="Description / Remarques">
        <TextArea
          rows={4}
          placeholder="Description de la classe, règles particulières d'affectation…"
          showCount
          maxLength={1000}
        />
      </Form.Item>
    </>
  );
};

export default GroupFormFields;