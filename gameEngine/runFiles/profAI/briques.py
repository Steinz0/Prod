from typing_extensions import Self
from .tools import SuperState, Comportement, ProxyObj, get_random_vec
from soccersimulator import Vector2D,SoccerAction
from soccersimulator.settings import maxPlayerShoot, maxPlayerSpeed, maxPlayerAcceleration

############################################ CLASSE COMPORTEMENT RACINE ##########################################

class ComportementNaif(Comportement):
    # Coefficients d'actions
    RUN_COEF = maxPlayerAcceleration
    GO_COEF = maxPlayerAcceleration / 5.

    SHOOT_COEF = maxPlayerShoot * 2
    DRIBBLE_COEF = maxPlayerShoot
    THROW_COEF = maxPlayerShoot * 4
    PASS_COEF = maxPlayerShoot / 2.

    # Init
    def __init__(self,state, lastHit):
        super(ComportementNaif,self).__init__(state)
        self.last_hit = lastHit

    # Action - Courir vers
    def run(self,p):
        return SoccerAction(acceleration=(p-self.me).normalize()*self.RUN_COEF)
    
    # Action - Se déplacer vers
    def go(self,p):
        return SoccerAction(acceleration=(p-self.me).normalize()*self.GO_COEF)

    # Action - Tirer la balle
    def shoot(self,shoot_coef=None):
        if shoot_coef is None:
            shoot_coef = self.SHOOT_COEF
        if self.can_kick:
            return SoccerAction(shoot=(self.his_goal-self.ball_p).normalize()*self.SHOOT_COEF)
        return SoccerAction()

    # Action - Dégager la balle
    def degage(self):
        if self.can_kick:
            return SoccerAction(shoot=(self.ball_p - self.my_goal).normalize()*self.THROW_COEF)
        return SoccerAction()

    # Action - Dribbler vers les cages
    def dribble(self) :
        return SoccerAction(acceleration=(self.his_goal - self.ball_p).normalize()*self.GO_COEF, shoot=(self.his_goal - self.ball_p).normalize()*self.DRIBBLE_COEF)

    # Action - Tirer la balle dans une direction précision
    def kick(self, p) :
        if self.can_kick :
            # On récupère les coéquipiers
            return SoccerAction(shoot=(p - self.ball_p).normalize()*self.PASS_COEF)
        return SoccerAction()

    # Action - Marquer le joueur adverse le plus proche de moi
    def marquageProche(self) :
        # Variables de recherche
        markDistance = 1000000
        markID = 0
        nbAdv = (len([i for i in self.players if (i[0] == self.his_team)]))

        # On itère sur les joueurs adverses
        for id in range(nbAdv) :
            dist = self.me.distance(self.player_state(self.his_team, id).position)
            if (dist < markDistance) :
                markDistance = dist
                markID = id

        # On se déplace vers le joueur adverse ciblé
        targetPos = self.player_state(self.his_team, markID).position
        return SoccerAction(acceleration=(targetPos - self.me).normalize()*self.RUN_COEF)

    # Action - Marquer le joueur adverse le plus proche des cages
    def marquageProcheBalle(self) :
        # On recupere la position de l'adversaire le plus proche de la balle
        pos = self.advClosestBall()
        return self.go(pos)

    # Recherche - Coéquipier le plus proche et renvoie sa position
    def findClosestTeammate(self) :
        # Variables de recherche
        tmDistance = 1000000
        tmID = 0
        (idT , idP) = self.key # Indice à ne pas étudier (il s'agit du joueur lui-même)
        nbTeam = (len([i for i in self.players if (i[0] == idT)]))

        # On itère sur les joueurs de l'équipe
        for id in range(nbTeam) :
            if (id != idP) :
                dist = self.me.distance(self.player_state(idT, idP).position)
                if (dist < tmDistance) :
                    tmDistance = dist
                    tmID = id

        # On retourne la position du coéquipier
        return self.player_state(idT, tmID).position

    # Recherche - Retourne la position de l'adversaire le plus proche de soi
    def advClosestSelf(self) :
        # Variables de recherche
        advDistance = 1000000
        advID = 0
        nbAdv = (len([i for i in self.players if (i[0] == self.his_team)]))

        # On itère sur les joueurs adverses
        for id in range(nbAdv) :
            dist = self.me.distance(self.player_state(self.his_team, id).position)
            if (dist < advDistance) :
                advDistance = dist
                advID = id

        # On se déplace vers le joueur adverse ciblé
        return self.player_state(self.his_team, advID).position

    # Recherche - Retourne la position de l'adversaire le plus proche de la balle
    def advClosestBall(self) :
        # Variables de recherche
        advDistance = 1000000
        advID = 0
        nbAdv = (len([i for i in self.players if (i[0] == self.his_team)]))

        # On itère sur les joueurs adverses
        for id in range(nbAdv) :
            dist = self.ball_p.distance(self.player_state(self.his_team, id).position)
            if (dist < advDistance) :
                advDistance = dist
                advID = id

        # On retourne la position du joueur adverse ciblé
        return self.player_state(self.his_team, advID).position

    # Recherche - Joueur adverse plus proche de la balle que moi
    def advCloserThanMe(self) :
        advPos = self.advClosestBall()
        return self.ball_p.distance(advPos) > self.distance(self.ball_p)

    @property
    def no_possession(self) :
        # Aucune équipe n'a la possesion de la balle
        return self.last_hit.LH == (0,0)
    @property
    def team_possession(self) :
        # L'équipe a la balle ou non
        return self.last_hit.LH[0] == self.key[0]

    # Mise à jour - Dernier joueur ayant touché la balle
    def updateLastHit(self) :
        self.last_hit.update(self.key)

############################################ CONDITIONS DEFENSIVES ##########################################

# Condition - Defenseur par défaut
class ConditionDefenseur(ProxyObj):
    COEF_DEF = 0.2
    COEF_WORRY = 0.05
    COEF_BALL = 0.2
    def __init__(self,state):
        super(ConditionDefenseur,self).__init__(state)
    
    # Status - Est en défense
    def is_defense(self):
        return self.ball_p.distance(self.my_goal)<self.COEF_DEF*self.width
        
    # Status - Proche de la balle
    def close_ball(self):
        return self.me.distance(self.ball_p)<self.COEF_BALL*self.width

    # Recherche - Positionner entre les cages et la balle (à mi-distance)
    def defensivePos(self) :
        initPos = self.getInitPos()
        tmp = (self.ball_p-self.my_goal).normalize()*self.width*0.1 + self.my_goal
        return Vector2D(x=((tmp.x + initPos.x) / 2.), y=((tmp.y + initPos.y) / 2.))

    # Recherche - Adversaire à proximité (en fonction de la crainte)
    def advNearMe(self) :
        nbAdv = (len([i for i in self.players if (i[0] == self.his_team)]))
        for id in range(nbAdv) :
            if (self.me.distance(self.player_state(self.his_team, id).position) < self.COEF_WORRY*self.width) :
                return True
        return False

    # Status - Position initiale du joueur
    def getInitPos(self) :
        return self.player_init_state(self.key[0], self.key[1])

# Action - Defenseur par défaut
def defenseur(I):
    if I.is_defense():
        return I.degage()+I.run(I.ball_p)
    return I.go((I.ball_p-I.my_goal).normalize()*I.width*0.1+I.my_goal)

# Action - Défenseur traditionnel
def defenseDT(I) :
    # Mise à jour de la position initiale
    # I.updateInitPos()

    # Action prioritaire - Dégager la balle si elle est trop proche des cages
    if I.is_defense() :
        return I.degage()+I.run(I.ball_p)

    # No team in possession ?
    if I.no_possession :
        # Is the player near the ball ?
        if I.close_ball() :
            # Can the player kick the ball ?
            if I.can_kick :
                I.updateLastHit()
                return I.degage()
            else :
                return I.run(I.ball_p)
        else :
            return I.run(I.defensivePos())
    else :
        # Is the player's team in possession ?
        if I.team_possession :
            # Is the player near the ball ?
            if I.close_ball() :
                # Can the player kick the ball ?
                if I.can_kick :
                    I.updateLastHit()
                    # Is there an opponent near me ?
                    if I.advNearMe() :
                        return I.degage()
                    else :
                        return I.dribble()
                else :
                    return I.run(I.ball_p)
            else :
                return I.run(I.defensivePos())
        else :
            # Is the ball near the player ?
            if I.close_ball() :
                # Can the player kick the ball ?
                if I.can_kick :
                    I.updateLastHit()
                    # Is there an opponent closer near me ?
                    if I.advNearMe() :
                        return I.degage()
                    else :
                        return I.dribble()
                else :
                    # Is there an opponent closer to me ?
                    if I.advCloserThanMe() :
                        return I.run(I.defensivePos())
                    else :
                        if I.advNearMe() :
                            return I.run(I.defensivePos())
                        else :
                            return I.run(I.ball_p)
            else :
                return I.go(I.defensivePos())


############################################ CONDITIONS OFFENSIVES ##########################################

# Condition Attaquant par défaut
class ConditionAttaque(ProxyObj):
    COEF_SHOOT = 0.2
    COEF_BALL = 0.1
    def __init__(self,state):
        super(ConditionAttaque,self).__init__(state)
    def close_goal(self):
        return self.me.distance(self.his_goal)<self.COEF_SHOOT*self.width
    def close_ball(self):
        return self.me.distance(self.ball_p)<self.COEF_BALL*self.width
 
# Action - Attaquant traditionnel
def forwardDT(I) :
    # Mise à jour de la position initiale
    #I.updateInitPos()

    # No team in possession ?
    if I.no_possession :
        # Can the player kick the ball ?
        if I.can_kick :
            I.updateLastHit()
            # Is the player near the goal ?
            if I.close_goal() :
                return I.shoot()
            else :
                return I.dribble()
        else :
            return I.run(I.ball_p)
    else :
        # Team in possesion ?
        if I.team_possession :
            # Ball near the player ?
            if I.close_ball() :
                # Can the player kick the ball ?
                if I.can_kick :
                    I.updateLastHit()
                    # Is the player near the goal ?
                    if I.close_goal() :
                        return I.shoot()
                    else :
                        return I.dribble()
                else :
                    return I.run(I.ball_p)
            else :
                return I.run(Vector2D() - I.advClosestSelf())
        else :
            # Can the player kick the ball ?
            if I.can_kick :
                I.updateLastHit()
                return I.degage()
            else :
                return I.run(I.ball_p)


# Action de fonceur par défaut
def fonceur(I) :
    if not I.can_kick :
        if I.close_ball() :
            return I.run(I.ball_p)
        else :
            return I.run(I.ball_p)
    else :
        if I.close_goal() :
            I.updLastHit()
            return I.shoot()
    I.updLastHit()
    if (I.advCloserThanMe()) :
        return I.degage()


