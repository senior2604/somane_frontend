"""
Fichier viewsets pour SomaneAI - À ajouter à votre backend Django
Chemin: somane_sarl/backend/src/core/viewsets_ai.py
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

# Supposons que vous avez ces modèles dans votre core/models.py:
# - Vente
# - StockArticle
# - Finance
# - Client
# - Fournisseur
# - Commande

class VentesViewSet(viewsets.ViewSet):
    """
    API pour les données de ventes (agrégées par mois/catégorie)
    """
    
    @action(detail=False, methods=['get'])
    def list(self, request):
        """Récupère les ventes du mois courant"""
        from django.db.models import F
        
        # Adapter avec votre modèle Vente
        start_date = timezone.now().replace(day=1)
        ventes = Vente.objects.filter(date__gte=start_date)
        
        return Response({
            'total': ventes.aggregate(Sum('montant'))['montant__sum'] or 0,
            'nombre': ventes.count(),
            'moyenne': ventes.aggregate(Avg('montant'))['montant__avg'] or 0,
            'data': [{
                'date': v.date,
                'montant': v.montant,
                'client_nom': v.client.nom if v.client else 'N/A',
                'categorie': v.categorie,
            } for v in ventes]
        })
    
    @action(detail=False, methods=['get'])
    def par_categorie(self, request):
        """Répartition des ventes par catégorie"""
        ventes = Vente.objects.values('categorie').annotate(total=Sum('montant'))
        return Response([
            {'name': v['categorie'] or 'Autres', 'value': v['total']}
            for v in ventes
        ])
    
    @action(detail=False, methods=['get'])
    def par_client(self, request):
        """Top 10 des clients"""
        ventes = Vente.objects.values('client__nom').annotate(
            total=Sum('montant')
        ).order_by('-total')[:10]
        return Response([
            {'name': v['client__nom'] or 'Anonyme', 'value': v['total']}
            for v in ventes
        ])


class StockViewSet(viewsets.ViewSet):
    """
    API pour les données de stock
    """
    
    @action(detail=False, methods=['get'])
    def list(self, request):
        """État du stock"""
        from core.models import StockArticle  # À adapter
        
        stock = StockArticle.objects.all()
        ruptures = stock.filter(quantite__lte=F('seuil_minimum'))
        
        return Response({
            'total': stock.aggregate(Sum('quantite'))['quantite__sum'] or 0,
            'nombre_articles': stock.count(),
            'ruptures': ruptures.count(),
            'valeur_stock': stock.aggregate(
                total=Sum(F('quantite') * F('prix_unitaire'))
            )['total'] or 0,
            'data': [{
                'nom': s.nom,
                'quantite': s.quantite,
                'seuil_minimum': s.seuil_minimum,
                'prix_unitaire': s.prix_unitaire,
            } for s in stock]
        })
    
    @action(detail=False, methods=['get'])
    def ruptures(self, request):
        """Articles en rupture""" 
        from core.models import StockArticle  # À adapter
        ruptures = StockArticle.objects.filter(quantite__lte=F('seuil_minimum'))
        return Response([{
            'nom': r.nom,
            'quantite': r.quantite,
            'seuil': r.seuil_minimum,
        } for r in ruptures])


class FinancesViewSet(viewsets.ViewSet):
    """
    API pour les données financières
    """
    
    @action(detail=False, methods=['get'])
    def list(self, request):
        """Résumé financier"""
        # À adapter avec votre modèle Finance
        start_date = timezone.now().replace(day=1)
        
        revenu = Vente.objects.filter(date__gte=start_date).aggregate(Sum('montant'))
        depenses = Finance.objects.filter(date__gte=start_date).aggregate(Sum('montant'))
        
        return Response({
            'periode': 'Mois courant',
            'revenu': revenu['montant__sum'] or 0,
            'depenses': depenses['montant__sum'] or 0,
            'benefice': (revenu['montant__sum'] or 0) - (depenses['montant__sum'] or 0),
        })
    
    @action(detail=False, methods=['get'])
    def par_categorie(self, request):
        """Dépenses par catégorie"""
        finances = Finance.objects.values('categorie').annotate(total=Sum('montant'))
        return Response([
            {'name': f['categorie'] or 'Autres', 'value': f['total']}
            for f in finances
        ])


class KPIsViewSet(viewsets.ViewSet):
    """
    API pour les KPIs d'entreprise
    """
    
    @action(detail=False, methods=['get'])
    def list(self, request):
        """Calcul des KPIs"""
        # Adapter avec vos données réelles
        
        # Exemple de calcul de KPI
        ventes_total = Vente.objects.aggregate(Sum('montant'))['montant__sum'] or 1
        target = 100000
        kpi_ventes = (ventes_total / target) * 100
        
        return Response({
            'Ventes': min(kpi_ventes, 100),
            'Qualité': 88,
            'Délai': 95,
            'Satisfaction': 85,
            'Stock': 92,
        })


class AIInteractionViewSet(viewsets.ViewSet):
    """
    Enregistre les interactions IA pour l'apprentissage
    """
    
    @action(detail=False, methods=['post'])
    def create_interaction(self, request):
        """Enregistre une interaction IA"""
        # À implémenter: sauvegarder les interactions pour améliorer l'IA
        question = request.data.get('question')
        reponse = request.data.get('reponse')
        donnees = request.data.get('donnees')
        
        # Sauvegarder dans la base de données pour apprentissage
        # AIInteraction.objects.create(
        #     question=question,
        #     reponse=reponse,
        #     donnees=donnees,
        # )
        
        return Response({'status': 'enregistré'})
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Récupère les analyses passées"""
        # Retourner les patterns trouvés
        return Response({
            'interactions_totales': 0,
            'sujets_frequents': ['ventes', 'stock', 'finances'],
        })
