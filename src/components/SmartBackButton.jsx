import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { navigationMemory } from '../utils/navigationMemory';

const defaultConfirmMessage = 'Des modifications ne sont pas sauvegardees. Quitter sans enregistrer ?';

export default function SmartBackButton({
  fallback = '/comptabilite/dashboard',
  hasUnsavedChanges = false,
  confirmMessage = defaultConfirmMessage,
  beforeLeave,
  clearMemoryKeys = [],
  preferCloseIcon = false,
  title = 'Retour',
  className = '',
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = async () => {
    if (hasUnsavedChanges && !window.confirm(confirmMessage)) return;

    if (typeof beforeLeave === 'function') {
      const result = await beforeLeave();
      if (result === false) return;
    }

    clearMemoryKeys.forEach((key) => navigationMemory.clear(key));

    const stateReturnTo = location.state?.returnTo || location.state?.returnContext?.returnTo;
    const savedContext = navigationMemory.getReturnContext();
    const contextReturnTo = savedContext?.returnTo;
    const target = stateReturnTo || contextReturnTo;

    if (target) {
      navigate(target, {
        replace: false,
        state: {
          restoredFromSmartBack: true,
          returnContext: savedContext || location.state?.returnContext || null,
        },
      });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback);
  };

  const Icon = preferCloseIcon ? FiX : FiArrowLeft;

  return (
    <button
      type="button"
      onClick={handleBack}
      title={title}
      aria-label={title}
      className={`w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center transition-all active:scale-95 ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}
