# 🚀 SomaneAI - Intégration des Vraies Données

## Vue d'ensemble

SomaneAI a été mis à jour pour utiliser vos **vraies données** du site. L'IA apprend automatiquement de ce que vous entrez et génère des analyses et des graphes en temps réel.

## Architecture

```
Frontend (React)
    ↓
apiService.js (requêtes API)
    ↓
Backend Django (URL: /api/)
    ↓
Vos modèles Django (Vente, Stock, Finance, etc.)
    ↓
Base de données (données réelles)
```

## Flux de Données

### 1. Récupération des Données
Quand vous ouvrez SomaneAI:
```
useAIData() → fetchVentesData() → GET /api/ventes/
                → fetchStockData() → GET 
                → fetchFinancesData() → GET /api/finances/
                → ... (toutes les données)
```

### 2. Analyse en Temps Réel
Les données sont analysées automatiquement:
```
ventesAnalytics = useVentesAnalytics(realData.ventes)
  → Calcul total, moyenne, max, min
  → Groupement par mois, catégorie, client

stockAnalytics = useStockAnalytics(realData.stock)
  → Détection des ruptures
  → Calcul de rotation

financesAnalytics = useFinancesAnalytics(realData.finances)
  → Bénéfice brut
  → Marge nette
```

### 3. Génération des Réponses IA
Quand vous posez une question:
```
Vous: "Analyse mes ventes"
    ↓
getAIResponse(message, realData)
    ↓
Génère réponse basée sur VOS chiffres
    ↓
generateChartData(type, topic, realData)
    ↓
Crée graphes avec VOS données
    ↓
Réponse + Graphes affichés
```

### 4. Apprentissage de l'IA
Après chaque interaction:
```
logAIInteraction(question, reponse, donnees)
    ↓
POST /api/ai-interactions/
    ↓
Sauvegardé en base
    ↓
L'IA améliore son modèle
```

## Configuration Backend Django

### Étape 1: URLs (urls.py)
```python
from rest_framework.routers import DefaultRouter
from core.viewsets_ai import (
    VentesViewSet, StockViewSet, FinancesViewSet, 
    KPIsViewSet, AIInteractionViewSet
)

router = DefaultRouter()
router.register(r'ventes', VentesViewSet, basename='ventes')
router.register(r'stock', StockViewSet, basename='stock')
router.register(r'finances', FinancesViewSet, basename='finances')
router.register(r'kpis', KPIsViewSet, basename='kpis')
router.register(r'ai-interactions', AIInteractionViewSet, basename='ai-interactions')

urlpatterns = [
    ...
    path('api/', include(router.urls)),
]
```

### Étape 2: Modèles (models.py)
*Adapter avec vos modèles existants:*
```python
class Vente(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    categorie = models.CharField(max_length=100)

class StockArticle(models.Model):
    nom = models.CharField(max_length=255)
    quantite = models.IntegerField()
    seuil_minimum = models.IntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

class Finance(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    categorie = models.CharField(max_length=100)
```

### Étape 3: Permissions & CORS
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}
```

## Variables d'Environnement

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
```

### Backend (.env)
```
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite:///db.sqlite3
```

## Fonctionnalités Activées

### ✅ Données Réelles
- Les graphes affichent VOS données
- Les analyses sont basées sur VOS chiffres
- Rien n'est mockée

### ✅ Apprentissage Automatique
- L'IA se souvient des analyses passées
- Elle détecte les patterns dans vos données
- Elle améliore ses recommandations

### ✅ Rafraîchissement en Temps Réel
- Clic sur l'icône 🔄 pour recharger les données
- Mise à jour automatique toutes les 5 minutes
- Notifications de chargement

### ✅ Alertes Intelligentes
- Ruptures de stock détectées automatiquement
- Anomalies budgétaires signalées
- Recommandations basées sur les données

## Exemples de Réponses avec Données Réelles

### Avant (Données Mockées)
```
"Ventes totales: 300K€"  ← Fausses données
```

### Après (Données Réelles)
```
"Ventes totales: 145,230.50€"  ← Vos vrais chiffres
"Stock en rupture: 3 articles"  ← Vos vrais alerts
```

## Personnalisation

### Ajouter un Nouveau Type de Données
1. Créer le ViewSet dans `viewsets_ai.py`
2. Ajouter le router dans `urls.py`
3. Créer le hook `useXXXAnalytics()` dans `useAIData.js`
4. Intégrer dans `getAIResponse()`

### Modifier les Seuils d'Alerte
```javascript
// useAIData.js
const ruptures = stockData.filter(s => 
  (s.quantite || 0) <= (s.seuil_minimum || 0)  // Modifiez le seuil ici
);
```

### Ajouter des Graphes Personnalisés
```javascript
// aiUtils.js
export const generateChartData = (type, topic, realData = {}) => {
  // Ajouter votre logique spécifique
}
```

## Dépannage

### Données Non Chargées
1. Vérifier l'URL API: `REACT_APP_API_URL`
2. Vérifier CORS dans Django
3. Vérifier les permissions d'accès

### Graphes Vides
1. Vérifier que les données existent en base
2. Vérifier le format des réponses API
3. Consulter la console (F12)

### L'IA ne Répond Pas Correctement
1. Vérifier les données reçues (Network tab)
2. Les réponses sont basées sur les données
3. Ajouter plus de données pour améliorer les analyses

## Prochaines Étapes

- [ ] Implémenter l'authentification JWT
- [ ] Ajouter les filtres par date
- [ ] Export des rapports PDF
- [ ] Prévisions avec Machine Learning
- [ ] Dashboards multiutilisateurs
- [ ] Alertes par email

---

**💡 Astuce:** Entrez plus de données dans votre système pour que l'IA fasse des analyses plus pertinentes!
