def add(obj):
    if obj['idx'] < 4000:
        obj['upper'] = False
    else:
        obj['upper'] = True
    
    if obj['idx'] < 1000:
        obj['info']['final'] = {}
        obj['info']['final']['correct'] = True
    return obj

def edit(obj):
    if obj['upper'] == False:
        del(obj['upper'])
        obj['lower'] = True
    return obj

def delete(obj):
    if obj.get('upper'):
        del(obj['upper'])
    if obj.get('lower'):
        del(obj['lower'])
    return obj