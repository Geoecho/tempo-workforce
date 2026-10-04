"""Original Tempo score and sound design, 100 BPM, 48 kHz stereo."""
import numpy as np, wave, os
sr=48000; duration=30; n=sr*duration
rng=np.random.default_rng(241); mix=np.zeros((n,2),dtype=np.float64)
def put(v,at,amp=1,pan=0):
    k=int(at*sr); size=min(len(v),n-k)
    if size<=0:return
    gains=np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
    mix[k:k+size]+=v[:size,None]*amp*gains[None,:]
def freq(m):return 440*2**((m-69)/12)
def tone(m,d,amp,at,pan=0,pluck=False):
    t=np.arange(int(d*sr))/sr; f=freq(m)
    v=np.sin(2*np.pi*f*t)+.24*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t)
    env=(1-np.exp(-t/.008))*np.exp(-t/(.34 if pluck else max(.3,d*.5)))
    env*=np.minimum(1,(d-t)/.15)
    put(v*env,at,amp,pan)
chords=[[52,59,66,71],[55,62,66,69],[48,55,62,64],[50,57,62,64],[52,59,66,71],[55,62,66,69],[52,59,64,66]]
for bar,chord in enumerate(chords):
    at=bar*4.8; d=min(5.2,duration-at)
    if d<=0:break
    t=np.arange(int(d*sr))/sr
    env=np.minimum(1,t/.8)*np.minimum(1,(d-t)/.9)
    for i,m in enumerate(chord):
        f=freq(m); wavev=np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*f*1.003*t)+.15*np.sin(2*np.pi*2*f*t)
        put(wavev*env,at,.045,(-.65+i*.43))
beat=.6
for b in range(50):
    at=b*beat
    # Soft rounded kick, a sine pitch envelope with a short click.
    t=np.arange(int(.35*sr))/sr
    f=48+110*np.exp(-t*35); phase=2*np.pi*np.cumsum(f)/sr
    kick=np.sin(phase)*np.exp(-t*14)+rng.normal(0,.07,len(t))*np.exp(-t*100)
    if b>=2 and b<46:put(kick,at,.25)
    chord=chords[min(b//8,6)]
    tone(chord[0]-12,.46,.105,at,0,True)
    for sub in [0,.3]:
        tt=np.arange(int(.11*sr))/sr
        noise=rng.normal(0,1,len(tt)); noise=np.concatenate([[0],np.diff(noise)])
        put(noise*np.exp(-tt*70),at+sub,.019, .35 if sub else -.35)
    if b%2==1 and 3<b<46:
        tt=np.arange(int(.16*sr))/sr
        noise=rng.normal(0,1,len(tt)); smooth=np.convolve(noise,np.ones(5)/5,'same')
        put((noise-smooth)*np.exp(-tt*30),at,.045)
    m=chord[(b*3)%4]+12
    tone(m,.55,.065,at+.3, .45 if b%2 else -.45,True)
    if 6<b<43 and b%4==2:tone(chord[2]+12,.42,.037,at+.45,-.3,True)
# Soft stereo echoes give the plucks space without washing out the motion hits.
dry=mix.copy()
for delay,level in [(.225,.12),(.45,.065),(.9,.028)]:
    shift=int(delay*sr); mix[shift:]+=dry[:-shift,::-1]*level
# Frame-accurate swells and low impacts on composition beats.
for i,at in enumerate([.25,3.6,8.4,13.2,18,23.4,26.4]):
    d=.62; t=np.arange(int(d*sr))/sr
    noise=rng.normal(0,1,len(t)); low=np.convolve(noise,np.ones(22)/22,'same')
    env=np.sin(np.pi*t/d)**2
    swirl=low*env+np.sin(2*np.pi*(250*t+130*t*t))*env*.11
    put(swirl,max(0,at-.23),.12,-.35 if i%2 else .35)
    hit=np.sin(2*np.pi*(52*t+8*(1-np.exp(-t*14))))*np.exp(-t*11)
    put(hit,at+.03,.13)
for at in [4.3,4.45,4.6,9.05,9.2,9.35,14.4,19.3,23.9,24.05,24.2,27.3]:
    t=np.arange(int(.10*sr))/sr
    put(np.sin(2*np.pi*1050*t)*np.exp(-t*68),at,.022,.15)
# Warm confirmation chime.
for at in [14.4,19.3,27.3]:
    tone(76,.75,.085,at,-.2,True);tone(83,.8,.052,at+.13,.2,True)
t=np.arange(n)/sr
fade=np.minimum(1,t/.45)*np.minimum(1,np.maximum(0,30-t)/1.1)
mix*=fade[:,None]
mix=np.tanh(mix*1.5)
mix*=.88/max(.88,np.max(np.abs(mix)))
os.makedirs('/home/user/tempo-ad',exist_ok=True)
with wave.open('/home/user/tempo-ad/soundtrack.wav','wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((mix*32767).astype('<i2').tobytes())
print('Original stereo score:',duration,'seconds; peak',round(float(np.max(np.abs(mix))),3))
