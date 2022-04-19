from soccersimulator import Vector2D, SoccerAction
from soccersimulator.settings import GAME_GOAL_HEIGHT,GAME_HEIGHT, GAME_WIDTH,BALL_RADIUS,PLAYER_RADIUS, MAX_BALL_KICK_LIMIT

def get_random_vec(factor=1):
    return Vector2D.create_random(-1 * factor,1 * factor)

def get_random_SoccerAction():
    return SoccerAction(get_random_vec(),get_random_vec())

class ProxyObj(object):
    def __init__(self,state):
        self._obj = state
    def __getattr__(self,attr):
        return getattr(self._obj,attr)

class SuperState(ProxyObj):
    def __init__(self,state,idt,idp):
        super(SuperState,self).__init__(state)
        self.key = (idt,idp)
    @property
    def my_team(self):
        return self.key[0]
    @property
    def his_team(self):
        return (2 -self.key[0])+1
    @property
    def me(self):
        return self.player_state(*self.key).position
    @property
    def my_goal(self):
        return Vector2D((self.my_team-1)*self.width,self.goal_center - (GAME_GOAL_HEIGHT / 2.))
    @property
    def his_goal(self):
        return Vector2D((self.his_team-1)*self.width,self.goal_center - (GAME_GOAL_HEIGHT / 2.))
    @property
    def ball_p(self):
        return self.ball.position
    @property
    def can_kick(self):
        if (self.ball.vitesse.norm < MAX_BALL_KICK_LIMIT) :
            return (self.distance(self.ball_p) < (PLAYER_RADIUS+BALL_RADIUS))
        return False
    @property
    def width(self):
        return GAME_WIDTH
    @property
    def height(self):
        return GAME_HEIGHT
    @property
    def goal_center(self):
        return self.goal_radius+self.height/2.
    @property
    def goal_radius(self):
        return GAME_GOAL_HEIGHT/2.

    def distance(self,p):
        return self.me.distance(p)

    

class Comportement(ProxyObj):
    def __init__(self,obj):
        super(Comportement,self).__init__(obj)
    def run(self,p):
        raise(NotImplementedError)
    def go(self,p):
        raise(NotImplementedError)
    def shoot(self):
        raise(NotImplementedError)
    def degage(self):
        raise(NotImplementedError)


def extrator_features(data):
    data_dict = dict()
    data_dict["ballCoord"] = [data["ballCoord"][0],data["ballCoord"][1]]
    redList = data["redCoords"]
    blueList = data["blueCoords"]
    data_dict["redCoords"] = []
    data_dict["blueCoords"] = []
    for r in redList:
        data_dict["redCoords"].append([int(r[0]),int(r[1])])
    for b in blueList:
        data_dict["blueCoords"].append([int(b[0]),int(b[1])])                  
