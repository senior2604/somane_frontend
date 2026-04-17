# ⚡ Quick Start - Intégration SomaneAI en 5 Étapes

## Étape 1: Configuration Backend Django (10 min)

### 1a. Ajouter à `settings.py`
```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Ajouter AVANT CommonMiddleware
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100
}
```

### 1b. Créer les endpoints API (`core/views.py`)
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from .models import Vente, StockArticle, Finance  # Adapter vos modèles

@api_view(['GET'])
def ventes_list(request):
    ventes = Vente.objects.all()
    return Response({
        'count': ventes.count(),
        'data': [{
            'id': v.id,
            'date': v.date,
            'montant': v.montant,
            'client_nom': v.client.nom if hasattr(v, 'client') else 'N/A',
            'categorie': getattr(v, 'categorie', 'N/A'),
        } for v in ventes[:50]]
    })

@api_view(['GET'])
def stock_list(request):
    stock = StockArticle.objects.all()
    return Response({
        'count': stock.count(),
        'data': [{
            'id': s.id,
            'nom': s.nom,
            'quantite': s.quantite,
            'seuil_minimum': getattr(s, 'seuil_minimum', 0),
            'prix_unitaire': getattr(s, 'prix_unitaire', 0),
        } for s in stock]
    })

@api_view(['GET'])
def finances_list(request):
    finances = Finance.objects.all()
    return Response({
        'count': finances.count(),
        'data': [{
            'id': f.id,
            'montant': f.montant,
            'categorie': getattr(f, 'categorie', 'N/A'),
            'date': f.date,
        } for f in finances[:50]]
    })
```

### 1c. Ajouter à `urls.py`
```python
from django.urls import path
from core.views import ventes_list, stock_list, finances_list

urlpatterns = [
    # ...
    path('api/ventes/', ventes_list, name='api-ventes'),
    path('api/stock/', stock_list, name='api-stock'),
    path('api/finances/', finances_list, name='api-finances'),
]
```

## Étape 2: Configuration Frontend (5 min)

### 2a. Créer `.env`
```
REACT_APP_API_URL=http://localhost:8000/api
```

### 2b. Vérifier `package.json` (dépendances déjà installées)
```bash
npm list recharts react-markdown
```

## Étape 3: Tester l'API (5 min)

### Tester depuis le navigateur
```
http://localhost:8000/api/ventes/
http://localhost:8000
http://localhost:8000/api/finances/
```

Vous devriez voir du JSON avec vos données réelles.

## Étape 4: Lancer l'Application (5 min)

### Terminal 1 - Backend
```bash
cd somane_sarl/backend/src
python manage.py runserver
```

### Terminal 2 - Frontend
```bash
cd somane_sarl/somane_frontend
npm start
```

## Étape 5: Tester SomaneAI (5 min)

1. Ouvrir `http://localhost:3000`
2. Aller à la page SomaneAI
3. Cliquez sur 🔄 (reload)
4. Posez une question : **"Analyse mes ventes"**

Vous devriez voir :
✅ Vos vrais chiffres dans la réponse
✅ Graphes avec VOS données
✅ Analyses pertinentes

---

## ✨ C'est fait! Vous avez maintenant une IA intelligente!

### Prochaines actions :
- [ ] Entrer plus de données dans votre site
- [ ] Poser des questions à SomaneAI
- [ ] Analyser les graphes générés
- [ ] Implémenter les recommandations de l'IA

---

### Dépannage Rapide

| Problème | Solution |
|---|---|
| Erreur CORS | Vérifier CORS_ALLOWED_ORIGINS dans settings.py |
| Pas de données | Vérifier que des données existent en base |
| Graphes vides | Consulter Network tab (F12) pour vérifier les réponses API |
| API non trouvée | Vérifier que Django fonctionne sur :8000 |

---

**Fait! 🚀**
