# ✅ Checklist de Configuration - SomaneAI

## 🎯 Avant de Commencer

### Frontend (React)
- [ ] `npm install` complété (dépendances installer)
- [ ] `.env` fichier créé avec `REACT_APP_API_URL`
- [ ] `SomaneAIPage.jsx` mis à jour
- [ ] `ChartComponent.jsx` créé
- [ ] `apiService.js` créé
- [ ] `aiUtils.js` mis à jour
- [ ] `useAIData.js` créé
- [ ] `npm start` lance sans erreurs

### Backend (Django)
- [ ] Django installé et configuré
- [ ] `rest_framework` installé
- [ ] `corsheaders` installé
- [ ] Modèles `Vente`, `Stock`, `Finance` existent
- [ ] `settings.py` configurations CORS ajoutées
- [ ] `urls.py` endpoints API créés
- [ ] `views.py` ou `viewsets.py` créés
- [ ] `python manage.py runserver` fonctionne

---

## 📋 Configuration Détaillée

### 1. Frontend - Installation (5 min)

```bash
# Vérifier les packages
npm list recharts react-markdown

# Si manquants, installer
npm install recharts react-markdown
```

✅ **Vérification** :
```bash
# Lancer React
npm start
# Devrait ouvrir http://localhost:3000 sans erreurs
```

### 2. Frontend - Variables d'Environnement (2 min)

Créer `.env` dans `somane_frontend/` :
```
REACT_APP_API_URL=http://localhost:8000/api
```

✅ **Vérification** :
```javascript
// Dans React console (F12)
console.log(process.env.REACT_APP_API_URL)
// Devrait afficher: http://localhost:8000/api
```

### 3. Backend - Installation (5 min)

```bash
pip install djangorestframework
pip install django-cors-headers
```

✅ **Vérification** :
```bash
python -c "import rest_framework; print(rest_framework.__version__)"
python -c "import corsheaders; print('CORS installed')"
```

### 4. Backend - Settings (10 min)

Éditer `somane_sarl/backend/src/somane_core/settings.py` :

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'corsheaders',  # NOUVEAU
    'core',  # ou votre app core
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # NOUVEAU (en premier!)
    'django.middleware.common.CommonMiddleware',
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
}
```

✅ **Vérification** :
- Pas d'erreurs de syntax
- Les imports sont corrects

### 5. Backend - URLs (10 min)

Créer/modifier les endpoints dans `core/urls.py` ou `urls.py` principal :

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def ventes_list(request):
    from core.models import Vente  # À adapter
    ventes = Vente.objects.all()[:50]
    data = [{
        'id': v.id,
        'date': str(v.date),
        'montant': float(v.montant),
        'client_nom': v.client.nom if v.client else 'N/A',
        'categorie': getattr(v, 'categorie', 'N/A'),
    } for v in ventes]
    return Response({'data': data, 'count': len(data)})

@api_view(['GET'])
def stock_list(request):
    from core.models import StockArticle  # À adapter
    stock = StockArticle.objects.all()
    data = [{
        'id': s.id,
        'nom': s.nom,
        'quantite': s.quantite,
        'seuil_minimum': getattr(s, 'seuil_minimum', 0),
        'prix_unitaire': float(getattr(s, 'prix_unitaire', 0)),
    } for s in stock]
    return Response({'data': data, 'count': len(data)})

@api_view(['GET'])
def finances_list(request):
    from core.models import Finance  # À adapter
    finances = Finance.objects.all()[:50]
    data = [{
        'id': f.id,
        'montant': float(f.montant),
        'categorie': getattr(f, 'categorie', 'N/A'),
    } for f in finances]
    return Response({'data': data, 'count': len(data)})

# Ajouter aux URL patterns
from django.urls import path

urlpatterns = [
    # ...
    path('api/ventes/', ventes_list, name='api-ventes'),
    path('api/stock/', stock_list, name='api-stock'),
    path('api/finances/', finances_list, name='api-finances'),
]
```

✅ **Vérification** :
```bash
python manage.py runserver
# Tester dans le navigateur:
# http://localhost:8000/api/ventes/
# Devrait retourner JSON avec vos données
```

### 6. Backend - CORS Vérification (2 min)

```bash
# Tester une requête depuis React
curl -H "Origin: http://localhost:3000" http://localhost:8000/api/ventes/

# Devrait retourner JSON (pas d'erreur CORS)
```

---

## 🔍 Diagnostique et Dépannage

### Test 1: Django fonctionne?

```bash
# Terminal 1
cd somane_sarl/backend/src
python manage.py runserver
# Vous devriez voir: "Starting development server at http://127.0.0.1:8000/"
```

✅ **OK** si vous voyez le serveur démarrer
❌ **Erreur** ? Vérifier Python version, Django installé

### Test 2: Endpoints API répondent?

Ouvrir le navigateur:
```
http://localhost:8000/api/ventes/
http://localhost:8000
http://localhost:8000/api/finances/
```

✅ **OK** si vous voyez du JSON
❌ **Erreur 404** ? Vérifier les URLs

### Test 3: CORS configuré?

Ouvrir DevTools (F12) → Console → Network
Poser une question dans SomaneAI
Vérifier l'onglet Network:
- Request vers `http://localhost:8000/api/ventes/`
- Status 200 (pas 403)
- Response contient les données

✅ **OK** si vous voyez 200 et des données
❌ **403 CORS error** ? Reconfigurer CORS dans settings

### Test 4: React récupère les données?

Ouvrir DevTools (F12) → Console
```javascript
console.log(process.env.REACT_APP_API_URL)
```

✅ **OK** si vous voyez `http://localhost:8000/api`
❌ **undefined** ? Recharger la page après avoir créé `.env`

### Test 5: SomaneAI fonctionne?

1. Aller à `http://localhost:3000`
2. Naviguer vers SomaneAI
3. Cliquer sur le bouton 🔄
4. Attendre "Chargement..." → "Données à jour"

✅ **OK** si "Données à jour" apparaît
❌ **Erreur réseau** ? Vérifier Django et CORS

---

## 📝 Checklist Avant le Go Live

### Frontend
- [ ] `.env` configuration correcte
- [ ] Tous les imports résolus (pas d'erreurs F12)
- [ ] Bouton 🔄 fonctionne
- [ ] Graphes s'affichent
- [ ] Réponses IA contiennent les chiffres réels

### Backend
- [ ] CORS configuré
- [ ] Endpoints `/api/ventes/`, ``, `/api/finances/` existent
- [ ] Données réelles en base Django
- [ ] Pas d'erreurs logs Django
- [ ] Tests CURL réussissent

### Intégration
- [ ] Django sur `http://localhost:8000`
- [ ] React sur `http://localhost:3000`
- [ ] Requête API depuis React à Django réussit
- [ ] Graphes utilise vraies données
- [ ] Alertes stock fonctionnent
- [ ] L'IA répond correctement

---

## 🆘 Problèmes Courants et Solutions

| Problème | Solution |
|----------|----------|
| CORS 403 | Vérifier CORS_ALLOWED_ORIGINS dans settings.py |
| API 404 | Vérifier path() dans urls.py |
| Pas de données | Entrer des données dans Django antes |
| Graphes vides | Vérifier les réponses API (F12 Network) |
| L'IA répond "Erreur réseau" | Vérifier REACT_APP_API_URL dans .env |
| Port 3000 déjà utilisé | Lancer React sur autre port: `npm start -- --port 3001` |
| Port 8000 déjà utilisé | Django sur autre port: `python manage.py runserver 8001` |

---

## 🎉 Validation Finale

Quand tout est prêt, vous devriez voir:

```
Frontend:
  ✅ SomaneAI se lance
  ✅ Pas d'erreurs en console (F12)
  ✅ Bouton 🔄 peut recharger

Backend:
  ✅ Django démarre sans erreur
  ✅ Endpoints API répondent
  ✅ Données réelles dans les réponses

Integration:
  ✅ Graphes s'affichent avec VOS données
  ✅ Réponses IA mentionnent vos montants
  ✅ Alertes fonctionnent (ruptures, etc.)
  ✅ Conversations sauvegardées

Final:
  ✅ Vous avez une IA qui comprend votre business
  ✅ Tous les graphes montrent VOS chiffres
  ✅ Les recommandations sont pertinentes
```

---

**🚀 Vous êtes prêt à utiliser SomaneAI avec vos vraies données!**
