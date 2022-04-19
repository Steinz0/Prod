from profAI import ParamSearch
from profAI import FonceurTestStrategy


expe = ParamSearch(strategy=FonceurTestStrategy(),
                   params={'strength': [0.1, 1]})
expe.start()
print(expe.get_res())

