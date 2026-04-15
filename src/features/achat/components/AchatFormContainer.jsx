// features/achat/components/AchatFormContainer.jsx
import React from 'react';
import FormContainer from '../../../components/shared/FormContainer';

export default function AchatFormContainer(props) {
  return <FormContainer moduleType="bons_commande" {...props} />;
}
