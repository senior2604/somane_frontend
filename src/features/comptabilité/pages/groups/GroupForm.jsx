// // src/features/comptabilite/pages/groups/GroupForm.jsx
// import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
// import {
//   Alert,
//   Button,
//   Card,
//   Col,
//   Divider,
//   Form,
//   Input,
//   InputNumber,
//   message,
//   Row,
//   Select,
//   Space,
//   Spin,
//   Tag,
//   Typography,
// } from 'antd';
// import { useEffect, useState } from 'react';
// import { useLocation, useNavigate, useParams } from 'react-router-dom';
// import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
// import useGroupStore from '../../../../stores/comptabilite/groupStore';

// const { Option } = Select;
// const { TextArea } = Input;
// const { Title, Text } = Typography;

// // Même clé que GroupList pour partager le framework sélectionné
// const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

// const GroupForm = () => {
//   const [form] = Form.useForm();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { id } = useParams();

//   const { createGroup, updateGroup, fetchGroupById, groups, fetchGroups } = useGroupStore();
//   const { frameworks, fetchFrameworks } = useFrameworkStore();

//   const [loading, setLoading] = useState(false);

//   // Résolution du framework initial :
//   // 1. Depuis location.state (passé par la liste via navigate)
//   // 2. Sinon depuis sessionStorage
//   const resolveInitialFramework = () => {
//     if (location.state?.frameworkId) return location.state.frameworkId;
//     const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
//     return saved ? parseInt(saved) : null;
//   };

//   const [selectedFramework, setSelectedFramework] = useState(resolveInitialFramework);

//   useEffect(() => {
//     loadFormData();
//   }, [id]);

//   const loadFormData = async () => {
//     setLoading(true);
//     try {
//       await fetchFrameworks();

//       if (id) {
//         // Mode édition : on charge le groupe et on écrase le framework par celui du groupe
//         const group = await fetchGroupById(id);
//         const fwId = group.framework;
//         setSelectedFramework(fwId);
//         sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));

//         await fetchGroups({ framework: fwId });

//         form.setFieldsValue({
//           framework: fwId,
//           code: group.code,
//           name: group.name,
//           code_prefix_start: group.code_prefix_start || '',
//           code_prefix_end: group.code_prefix_end || '',
//           sequence: group.sequence ?? 0,
//           parent: group.parent || null,
//           company: group.company || [],          // ManyToMany
//           excluded_account_ids: group.excluded_account_ids || [],  // ManyToMany
//           note: group.note || '',
//         });
//       } else {
//         // Mode création : pré-remplir le framework depuis l'état/session
//         if (selectedFramework) {
//           form.setFieldValue('framework', selectedFramework);
//           await fetchGroups({ framework: selectedFramework });
//         }
//       }
//     } catch (error) {
//       message.error('Impossible de charger les données du formulaire');
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFrameworkChange = async (frameworkId) => {
//     setSelectedFramework(frameworkId);
//     sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
//     // Réinitialiser le parent car il appartient à l'ancien framework
//     form.setFieldValue('parent', null);
//     if (frameworkId) {
//       await fetchGroups({ framework: frameworkId });
//     }
//   };

//   const onFinish = async (values) => {
//     setLoading(true);
//     try {
//       const payload = {
//         ...values,
//         // Normalisation des ManyToMany : s'assurer que ce sont des tableaux
//         company: values.company || [],
//         excluded_account_ids: values.excluded_account_ids || [],
//       };

//       if (id) {
//         await updateGroup(id, payload);
//         message.success('Classe modifiée avec succès');
//       } else {
//         await createGroup(payload);
//         message.success('Classe créée avec succès');
//       }
//       navigate('/comptabilite/groups');
//     } catch (error) {
//       const errorData = error.response?.data;
//       if (errorData && typeof errorData === 'object') {
//         // Affichage des erreurs de validation champ par champ
//         Object.entries(errorData).forEach(([field, errors]) => {
//           const msgs = Array.isArray(errors) ? errors.join(', ') : String(errors);
//           message.error(`${field} : ${msgs}`);
//         });
//       } else {
//         message.error(error.message || 'Erreur lors de la sauvegarde');
//       }
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Parents disponibles = groupes du même framework, sans le groupe courant
//   const availableParents = groups.filter((g) => g.id !== parseInt(id));

//   const selectedFw = frameworks.find((f) => f.id === selectedFramework);

//   return (
//     <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
//       <Card
//         bordered={false}
//         style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 8 }}
//       >
//         {/* En-tête */}
//         <div style={{ marginBottom: 32 }}>
//           <Title level={3} style={{ margin: 0 }}>
//             {id ? 'Modifier la classe de comptes' : 'Créer une nouvelle classe'}
//           </Title>
//           <Text type="secondary">
//             {id
//               ? 'Modifiez les informations de la classe comptable'
//               : 'Définissez une nouvelle classe ou groupe de comptes'}
//           </Text>
//         </div>

//         {/* Bandeau informatif sur le référentiel actif */}
//         {selectedFw && (
//           <Alert
//             type="info"
//             showIcon
//             style={{ marginBottom: 24 }}
//             message={
//               <span>
//                 Référentiel actif :{' '}
//                 <Tag color="blue">
//                   {selectedFw.code} – {selectedFw.name}
//                 </Tag>
//                 {selectedFw.version && (
//                   <Text type="secondary" style={{ fontSize: 12 }}>
//                     &nbsp;v{selectedFw.version}
//                   </Text>
//                 )}
//               </span>
//             }
//           />
//         )}

//         <Spin spinning={loading}>
//           <Form
//             form={form}
//             layout="vertical"
//             onFinish={onFinish}
//             requiredMark="optional"
//             size="large"
//           >
//             {/* ── Référentiel & identifiants ─────────────────────────────── */}
//             <Divider orientation="left">Référentiel & Identification</Divider>

//             <Row gutter={16}>
//               <Col xs={24} md={12}>
//                 <Form.Item
//                   name="framework"
//                   label="Référentiel comptable"
//                   rules={[{ required: true, message: 'Sélectionnez un référentiel' }]}
//                   tooltip="Plan comptable auquel appartient cette classe (SYSCOHADA, PCGFR…)"
//                 >
//                   <Select
//                     placeholder="Sélectionnez un plan comptable"
//                     onChange={handleFrameworkChange}
//                     // En édition on verrouille le référentiel pour ne pas orpheliner les comptes
//                     disabled={!!id}
//                     showSearch
//                     optionFilterProp="children"
//                   >
//                     {frameworks.map((fw) => (
//                       <Option key={fw.id} value={fw.id}>
//                         <Text strong>{fw.code}</Text>
//                         <Text type="secondary"> – {fw.name}</Text>
//                       </Option>
//                     ))}
//                   </Select>
//                 </Form.Item>
//               </Col>

//               <Col xs={24} md={6}>
//                 <Form.Item
//                   name="code"
//                   label="Code"
//                   rules={[
//                     { required: true, message: 'Le code est obligatoire' },
//                     { max: 8, message: 'Maximum 8 caractères' },
//                     {
//                       pattern: /^[A-Za-z0-9]+$/,
//                       message: 'Alphanumérique uniquement',
//                     },
//                   ]}
//                   tooltip="Code de la classe (ex : 1, 2, 21, 211)"
//                 >
//                   <Input
//                     placeholder="ex : 1"
//                     style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
//                   />
//                 </Form.Item>
//               </Col>

//               <Col xs={24} md={6}>
//                 <Form.Item
//                   name="sequence"
//                   label="Ordre d'affichage"
//                   tooltip="Numéro de tri dans la liste (0 = premier)"
//                   initialValue={0}
//                 >
//                   <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
//                 </Form.Item>
//               </Col>
//             </Row>

//             <Form.Item
//               name="name"
//               label="Nom de la classe"
//               rules={[
//                 { required: true, message: 'Le nom est obligatoire' },
//                 { max: 255, message: 'Maximum 255 caractères' },
//               ]}
//             >
//               <Input placeholder="ex : Comptes de capitaux" />
//             </Form.Item>

//             {/* ── Hiérarchie ─────────────────────────────────────────────── */}
//             <Divider orientation="left">Hiérarchie</Divider>

//             <Form.Item
//               name="parent"
//               label="Classe parente"
//               tooltip="Laissez vide pour une classe racine (premier niveau)"
//             >
//               <Select
//                 placeholder={
//                   selectedFramework
//                     ? 'Aucune (classe racine)'
//                     : 'Sélectionnez d"abord un référentiel'
//                 }
//                 allowClear
//                 disabled={!selectedFramework}
//                 showSearch
//                 optionFilterProp="children"
//               >
//                 {availableParents.map((group) => (
//                   <Option key={group.id} value={group.id}>
//                     <Text code>{group.code}</Text>
//                     <Text> – {group.name}</Text>
//                   </Option>
//                 ))}
//               </Select>
//             </Form.Item>

//             {/* ── Plage de comptes ───────────────────────────────────────── */}
//             <Divider orientation="left">Plage de comptes</Divider>

//             <Alert
//               type="info"
//               showIcon
//               style={{ marginBottom: 16 }}
//               message="La plage détermine quels comptes sont rattachés automatiquement à cette classe via leur préfixe de code."
//             />

//             <Row gutter={16}>
//               <Col xs={24} md={12}>
//                 <Form.Item
//                   name="code_prefix_start"
//                   label="Début de plage"
//                   tooltip="Premier code de compte inclus dans cette classe (ex : 10)"
//                 >
//                   <Input
//                     placeholder="ex : 10"
//                     style={{ fontFamily: 'monospace' }}
//                   />
//                 </Form.Item>
//               </Col>

//               <Col xs={24} md={12}>
//                 <Form.Item
//                   name="code_prefix_end"
//                   label="Fin de plage"
//                   tooltip="Dernier code de compte inclus dans cette classe (ex : 19)"
//                 >
//                   <Input
//                     placeholder="ex : 19"
//                     style={{ fontFamily: 'monospace' }}
//                   />
//                 </Form.Item>
//               </Col>
//             </Row>

//             {/* ── Exclusions ─────────────────────────────────────────────── */}
//             <Form.Item
//               name="excluded_account_ids"
//               label="Comptes exclus de la plage"
//               tooltip="Comptes qui, bien que dans la plage, ne doivent PAS être rattachés à cette classe"
//             >
//               <Select
//                 mode="multiple"
//                 placeholder="Aucun compte exclu"
//                 allowClear
//                 disabled={!selectedFramework}
//                 optionFilterProp="children"
//                 // Les comptes disponibles proviendraient d'un store accounts — à brancher
//                 // Pour l'instant le champ est présent et fonctionnel pour l'envoi des IDs
//               >
//                 {/* <Option key={account.id} value={account.id}>{account.code} – {account.name}</Option> */}
//               </Select>
//             </Form.Item>

//             {/* ── Périmètre sociétés ─────────────────────────────────────── */}
//             <Divider orientation="left">Périmètre</Divider>

//             <Form.Item
//               name="company"
//               label="Sociétés concernées"
//               tooltip="Laissez vide si la classe s'applique à toutes les sociétés du référentiel"
//             >
//               <Select
//                 mode="multiple"
//                 placeholder="Toutes les sociétés (par défaut)"
//                 allowClear
//                 optionFilterProp="children"
//                 // Les entités proviendraient d'un store entities — à brancher selon votre architecture
//               >
//                 {/* {entities.map(e => <Option key={e.id} value={e.id}>{e.name}</Option>)} */}
//               </Select>
//             </Form.Item>

//             {/* ── Notes ──────────────────────────────────────────────────── */}
//             <Divider orientation="left">Notes</Divider>

//             <Form.Item
//               name="note"
//               label="Description / Remarques"
//             >
//               <TextArea
//                 rows={4}
//                 placeholder="Description de la classe, règles particulières d'affectation, remarques comptables…"
//                 showCount
//                 maxLength={1000}
//               />
//             </Form.Item>

//             <Divider />

//             {/* ── Actions ────────────────────────────────────────────────── */}
//             <Form.Item style={{ marginBottom: 0 }}>
//               <Space>
//                 <Button
//                   type="primary"
//                   htmlType="submit"
//                   icon={<SaveOutlined />}
//                   size="large"
//                   loading={loading}
//                 >
//                   {id ? 'Mettre à jour' : 'Créer la classe'}
//                 </Button>
//                 <Button
//                   size="large"
//                   icon={<CloseOutlined />}
//                   onClick={() => navigate('/comptabilite/groups')}
//                 >
//                   Annuler
//                 </Button>
//               </Space>
//             </Form.Item>
//           </Form>
//         </Spin>
//       </Card>
//     </div>
//   );
// };

// export default GroupForm;