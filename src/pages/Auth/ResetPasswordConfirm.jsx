// src/pages/Auth/ResetPasswordConfirm.jsx

import React, { useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiX,
} from 'react-icons/fi';

import { apiClient } from '../../services/apiClient';


const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'Au moins 8 caractères',
    validate: (password) => password.length >= 8,
  },
  {
    id: 'lowercase',
    label: 'Au moins une lettre minuscule',
    validate: (password) => /[a-z]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'Au moins une lettre majuscule',
    validate: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'Au moins un chiffre',
    validate: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'Au moins un caractère spécial',
    validate: (password) => (
      /[^A-Za-z0-9\s]/.test(password)
    ),
  },
];


function getApiError(requestError) {
  const apiErrors =
    requestError?.data ||
    requestError?.response?.data ||
    {};

  if (Array.isArray(apiErrors.new_password)) {
    return apiErrors.new_password.join(' ');
  }

  if (Array.isArray(apiErrors.token)) {
    return apiErrors.token.join(' ');
  }

  if (Array.isArray(apiErrors.uid)) {
    return apiErrors.uid.join(' ');
  }

  if (Array.isArray(apiErrors.non_field_errors)) {
    return apiErrors.non_field_errors.join(' ');
  }

  if (typeof apiErrors.detail === 'string') {
    return apiErrors.detail;
  }

  if (typeof requestError?.message === 'string') {
    return requestError.message;
  }

  return (
    'Le lien est invalide, a expiré ou a déjà été utilisé.'
  );
}


export default function ResetPasswordConfirm() {
  const navigate = useNavigate();
  const { uid, token } = useParams();

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const linkIsValid = Boolean(uid && token);

  const passwordRuleResults = PASSWORD_RULES.map(
    (rule) => ({
      ...rule,
      valid: rule.validate(newPassword),
    })
  );

  const passwordIsValid =
    newPassword.length > 0 &&
    passwordRuleResults.every((rule) => rule.valid);

  const confirmationIsValid =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const canSubmit =
    linkIsValid &&
    passwordIsValid &&
    confirmationIsValid &&
    !loading;

  const validateForm = () => {
    if (!linkIsValid) {
      return (
        'Le lien de réinitialisation est incomplet ' +
        'ou invalide.'
      );
    }

    if (!newPassword) {
      return (
        'Le nouveau mot de passe est obligatoire.'
      );
    }

    if (!passwordIsValid) {
      return (
        'Le mot de passe ne respecte pas toutes les ' +
        'exigences de sécurité.'
      );
    }

    if (!confirmPassword) {
      return (
        'La confirmation du mot de passe est obligatoire.'
      );
    }

    if (!confirmationIsValid) {
      return (
        'Les deux mots de passe ne correspondent pas.'
      );
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post(
        '/auth/users/reset_password_confirm/',
        {
          uid,
          token,
          new_password: newPassword,
        }
      );

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: (
              'Votre mot de passe a été modifié. ' +
              'Vous pouvez maintenant vous connecter.'
            ),
          },
        });
      }, 2000);
    } catch (requestError) {
      console.error(
        'Erreur de réinitialisation :',
        requestError
      );

      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  if (!linkIsValid) {
    return (
      <div
        className="
          min-h-screen bg-gray-50
          flex items-center justify-center
          px-4
        "
      >
        <div
          className="
            w-full max-w-md
            bg-white border border-red-200
            shadow-sm p-8 text-center
          "
        >
          <FiAlertCircle
            size={46}
            className="mx-auto mb-4 text-red-600"
          />

          <h1
            className="
              mb-2 text-xl font-bold text-gray-900
            "
          >
            Lien invalide
          </h1>

          <p className="mb-6 text-sm text-gray-600">
            Le lien de réinitialisation est incomplet
            ou ne contient pas les informations nécessaires.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="
              h-10 w-full
              bg-purple-600
              text-sm font-medium text-white
              hover:bg-purple-700
            "
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="
          min-h-screen bg-gray-50
          flex items-center justify-center
          px-4
        "
      >
        <div
          className="
            w-full max-w-md
            bg-white border border-gray-200
            shadow-sm p-8 text-center
          "
        >
          <FiCheckCircle
            size={46}
            className="mx-auto mb-4 text-green-600"
          />

          <h1
            className="
              mb-2 text-xl font-bold text-gray-900
            "
          >
            Mot de passe modifié
          </h1>

          <p className="text-sm text-gray-600">
            Votre nouveau mot de passe a été enregistré.
            Vous allez être redirigé vers la connexion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        min-h-screen bg-gray-50
        flex items-center justify-center
        px-4 py-10
      "
    >
      <div
        className="
          w-full max-w-md
          bg-white border border-gray-200
          shadow-sm
        "
      >
        <div
          className="
            border-b border-gray-200
            px-6 py-5
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                w-10 h-10 rounded-full
                bg-purple-100 text-purple-700
                flex items-center justify-center
              "
            >
              <FiLock size={20} />
            </div>

            <div>
              <h1
                className="
                  text-lg font-bold text-gray-900
                "
              >
                Nouveau mot de passe
              </h1>

              <p className="text-xs text-gray-500">
                Définissez un nouveau mot de passe
                sécurisé pour votre compte SOMANE ERP.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
          noValidate
        >
          {error && (
            <div
              className="
                flex items-start gap-2
                border border-red-200
                bg-red-50 px-3 py-2
                text-sm text-red-700
              "
            >
              <FiAlertCircle
                size={16}
                className="
                  mt-0.5 flex-shrink-0
                "
              />

              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="
                mb-1 block
                text-xs font-medium text-gray-700
              "
            >
              Nouveau mot de passe *
            </label>

            <div className="relative">
              <input
                id="new-password"
                name="newPassword"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setError('');
                }}
                autoComplete="new-password"
                className="
                  h-10 w-full
                  border border-gray-300
                  px-3 pr-10 text-sm
                  focus:border-purple-500
                  focus:outline-none
                  focus:ring-1
                  focus:ring-purple-500
                  disabled:bg-gray-100
                "
                disabled={loading}
                required
              />

              <button
                type="button"
                onClick={() => {
                  setShowPassword(
                    (current) => !current
                  );
                }}
                disabled={loading}
                className="
                  absolute right-0 top-0
                  h-10 w-10
                  flex items-center justify-center
                  text-gray-500
                  hover:text-gray-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
              >
                {showPassword
                  ? <FiEyeOff size={17} />
                  : <FiEye size={17} />}
              </button>
            </div>
          </div>

          {newPassword && (
            <div
              className="
                border border-gray-200
                bg-gray-50 px-3 py-3
              "
            >
              <p
                className="
                  mb-2 text-xs font-medium text-gray-700
                "
              >
                Exigences de sécurité
              </p>

              <ul className="space-y-1.5">
                {passwordRuleResults.map((rule) => (
                  <li
                    key={rule.id}
                    className={`
                      flex items-center gap-2 text-xs
                      ${
                        rule.valid
                          ? 'text-green-700'
                          : 'text-red-600'
                      }
                    `}
                  >
                    {rule.valid
                      ? <FiCheck size={13} />
                      : <FiX size={13} />}

                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label
              htmlFor="confirm-password"
              className="
                mb-1 block
                text-xs font-medium text-gray-700
              "
            >
              Confirmer le nouveau mot de passe *
            </label>

            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={
                  showConfirmation
                    ? 'text'
                    : 'password'
                }
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value
                  );
                  setError('');
                }}
                autoComplete="new-password"
                className={`
                  h-10 w-full
                  border px-3 pr-10 text-sm
                  focus:outline-none focus:ring-1
                  disabled:bg-gray-100
                  ${
                    !confirmPassword
                      ? (
                        'border-gray-300 ' +
                        'focus:border-purple-500 ' +
                        'focus:ring-purple-500'
                      )
                      : confirmationIsValid
                        ? (
                          'border-green-400 ' +
                          'focus:border-green-500 ' +
                          'focus:ring-green-500'
                        )
                        : (
                          'border-red-400 ' +
                          'focus:border-red-500 ' +
                          'focus:ring-red-500'
                        )
                  }
                `}
                disabled={loading}
                required
              />

              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(
                    (current) => !current
                  );
                }}
                disabled={loading}
                className="
                  absolute right-0 top-0
                  h-10 w-10
                  flex items-center justify-center
                  text-gray-500
                  hover:text-gray-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label={
                  showConfirmation
                    ? 'Masquer la confirmation'
                    : 'Afficher la confirmation'
                }
              >
                {showConfirmation
                  ? <FiEyeOff size={17} />
                  : <FiEye size={17} />}
              </button>
            </div>

            {confirmPassword && (
              <div
                className={`
                  mt-1 flex items-center gap-1
                  text-xs
                  ${
                    confirmationIsValid
                      ? 'text-green-700'
                      : 'text-red-600'
                  }
                `}
              >
                {confirmationIsValid
                  ? <FiCheck size={13} />
                  : <FiX size={13} />}

                <span>
                  {confirmationIsValid
                    ? 'Les mots de passe correspondent.'
                    : (
                      'Les mots de passe ne ' +
                      'correspondent pas.'
                    )}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="
              h-10 w-full
              bg-purple-600
              text-sm font-medium text-white
              hover:bg-purple-700
              disabled:cursor-not-allowed
              disabled:bg-gray-400
              disabled:text-gray-100
            "
          >
            {loading
              ? 'Enregistrement...'
              : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}