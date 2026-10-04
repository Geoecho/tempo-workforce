// Native Higgsedit motion design. Run: higgsedit build tempo-ad.mjs
export default async ({ project, frame, rect, text, icon }) => {
  const p = await project({ dir: '/home/user/tempo-ad', size: '1920x1080', fps: 60, background: '#F6F8F2' });
  const C = { paper:'#F6F8F2', ink:'#1B3026', green:'#254E3D', mint:'#DFEAD7', muted:'#73816F', line:'#DCE4D5', white:'#FFFFFF' };
  const ease = [.22,1,.36,1];
  const R = (x,y,w,h,fill=C.white,radius=18,extra={}) => rect({x,y,width:w,height:h,fill,radius,...extra});
  const T = (value,x,y,size=30,width=600,color=C.ink,weight=400,extra={}) => text(value,{x,y,width,height:size*3.3,fontFamily:'Inter',fontSize:size,fontWeight:weight,color,lineHeight:1.15,letterSpacing:size>60?-size*.045:0,...extra});
  const I = (name,x,y,size=36,color=C.green,extra={}) => icon(name,{x,y,size,color,strokeWidth:1.7,...extra});
  const enter = (x=0,y=45,at=0,duration=.7) => ({ enter:{from:{x,y,opacity:0,scale:.985},at,duration,easing:ease} });
  const wrap = (name,x,y,w,h,children,opts={}) => frame({name,x,y,width:w,height:h,layout:'none',...opts},children);
  const logo = (x,y,s=1,color=C.green,animated=false) => wrap('Tempo mark',x,y,420*s,105*s,[
    ...[55,94,72].map((h,i)=>R(i*29*s,(100-h)*s,18*s,h*s,color,8*s,{animate:animated?[{property:'offsetY',from:55,to:0,at:i*.08,duration:.65,easing:ease},{property:'opacity',from:0,to:1,at:i*.08,duration:.5}]:[]})),
    T('tempo',105*s,9*s,76*s,300*s,color,600)
  ],{animate:[{property:'rotation',from:-8,to:0,duration:.8,easing:ease}]});
  const chip = (label,x,y,w=180,color=C.green,bg=C.mint) => wrap(label,x,y,w,46,[R(0,0,w,46,bg,12),T(label,15,10,20,w-25,color,600)]);
  const avatar = (initials,x,y,color=C.mint,s=68) => [R(x,y,s,s,color,s/2),T(initials,x,y+s*.27,s*.28,s,C.green,600,{align:'center'})];
  const scene = (name,at,dur,nodes,bg=null) => p.compose(wrap(name,0,0,1920,1080,[...(bg?[R(0,0,1920,1080,bg,0)]:[]),...nodes],{motion:{enter:{from:{opacity:0},duration:.25},exit:{to:{opacity:0,y:-12},duration:.3,anchor:'end',easing:'ease-in'}}}),{at,dur,name});
  const copy = (kicker,headline,body,dark=false) => [
    T(kicker,140,210,22,650,dark?'#B7CEB5':C.muted,600,{letterSpacing:2}),
    T(headline,140,272,91,720,dark?C.paper:C.ink,600,{motion:{by:'word',from:{y:34,opacity:0},at:.15,duration:.6,overlap:.65,easing:'house'}}),
    T(body,144,552,30,625,dark?'#B9CEB8':C.muted,400,{animate:[{property:'offsetY',from:24,to:0,at:.35,duration:.7,easing:ease},{property:'opacity',from:0,to:1,at:.35,duration:.55}]})
  ];
  p.compose([R(0,0,1920,1080,{kind:'radial',stops:[{offset:0,color:'#FEFFF9'},{offset:1,color:C.paper}]},0),logo(135,70,.48)],{at:0,dur:26.4,name:'Brand and paper'});
  scene('01 / A better rhythm',0,4.05,[
    T('WORK MOVES FAST.',270,215,25,1380,C.muted,600,{align:'center',letterSpacing:4}),
    T('Bring it into rhythm.',190,300,126,1540,C.ink,600,{align:'center',motion:{by:'word',from:{y:80,opacity:0},at:.12,duration:.8,overlap:.65,easing:'house'}}),
    ...[['Plan','calendar-days'],['People','users-round'],['Hours & pay','clock-3']].map(([label,name],i)=>wrap(label,245+i*495,565,440,230,[
      R(0,0,440,230,i===1?C.green:C.white,24,{strokeColor:C.line,strokeWidth:i===1?0:1}),
      I(name,35,36,42,i===1?C.mint:C.green),T(label,35,120,35,360,i===1?C.paper:C.ink,600),
      I('arrow-right',355,135,26,i===1?C.mint:C.muted)
    ],{motion:{enter:{from:{x:i===0?-110:i===2?110:0,y:110,opacity:0,rotation:i===0?-8:i===2?8:0},at:.65+i*.1,duration:1,easing:ease}}}))
  ]);
  const schedule = [
    R(0,0,830,670,C.white,28,{strokeColor:C.line,strokeWidth:1,shadow:{y:18,blur:40,color:'#15362118'}}),
    T('Shifts',35,29,31,400,C.ink,600),I('plus',726,29,27),I('calendar-days',765,29,27),
    R(35,91,760,1,C.line,0),
    ...['Mon','Tue','Wed','Thu','Fri'].map((day,i)=>wrap(day,36+i*155,121,138,108,[
      R(0,0,138,108,i===2?C.mint:C.paper,14),T(day,0,12,19,138,C.muted,400,{align:'center'}),T(String(12+i),0,43,34,138,C.green,600,{align:'center'})
    ],{motion:enter(0,20,.3+i*.05,.6)})),
    T('TODAY',38,270,17,500,C.muted,600,{letterSpacing:2}),
    ...[['08:00','Stage crew','Northline Festival','AM  SB  +4'],['10:00','Production','East gate','JK  +2'],['12:00','Security','Main entrance','EL  +2']].map(([time,title,site,people],i)=>wrap(title,35,317+i*105,760,88,[
      R(0,0,760,88,[C.mint,'#ECEADF','#E3EDE5'][i],15),T(time,20,20,25,100,C.green,600),T(title,150,14,24,390,C.ink,600),T(site,150,47,18,390,C.muted),chip(people,610,23,130,C.green,C.white)
    ],{motion:enter(75,0,.55+i*.12,.7)}))
  ];
  scene('02 / Plan shifts',3.6,5.2,[...copy('PLAN','Plan every\nshift.','The right people.\nThe right place. The right time.'),wrap('Schedule',950,185,830,670,schedule,{motion:enter(160,20,.15,.85)})]);
  const names=[['AM','Alex Morgan','Stage crew','#DCEAD6'],['JL','Jordan Lee','Lighting tech','#E7DFF1'],['CC','Casey Chen','Runner','#F0E4CC']];
  scene('03 / People in sync',8.4,5.2,[...copy('PEOPLE','Keep people\nin sync.','Teams, assignments, and tasks.\nOne clear view for everyone.'),wrap('Team',950,192,830,667,[
    R(0,0,830,667,C.white,28,{strokeColor:C.line,strokeWidth:1,shadow:{y:18,blur:40,color:'#15362118'}}),
    T('People & teams',35,29,31,650,C.ink,600),chip('Production',35,102,210),T('3 team members',490,115,22,300,C.muted),
    ...names.map(([initial,name,role,color],i)=>wrap(name,35,198+i*124,760,108,[
      R(0,0,760,108,C.paper,18),...avatar(initial,18,20,color),T(name,112,20,27,360,C.ink,600),T(role,112,58,21,370,C.muted),I('check',688,40,32)
    ],{motion:enter(110,0,.35+i*.15,.8)})),
    wrap('Assignment saved',345,583,425,55,[R(0,0,425,55,C.green,14),I('check',18,14,26,C.mint),T('Everyone knows what is next.',57,16,19,350,C.paper)],{motion:enter(0,30,1.25,.7)})
  ],{motion:enter(100,15,.2,.8)})]);
  const phone = [
    R(0,0,438,760,'#D5E2CC',45,{shadow:{y:25,blur:45,color:'#061D2033'}}),R(9,9,420,742,C.paper,37),
    R(173,29,92,8,'#CAD5C4',4),T('YOUR NEXT SHIFT',30,90,17,375,C.muted,600,{align:'center',letterSpacing:1}),
    T('Stage crew',28,136,36,382,C.ink,600,{align:'center'}),T('Northline Festival',20,188,22,398,C.muted,400,{align:'center'}),
    R(73,260,292,292,C.mint,31),R(146,329,146,146,C.green,73),
    I('check',180,363,79,C.paper,{animate:[{property:'scale',from:.6,to:1,at:1.2,duration:.65,easing:ease},{property:'opacity',from:0,to:1,at:1.2,duration:.25}]}),
    T('Check-in recorded',30,589,26,380,C.ink,600,{align:'center',animate:[{property:'opacity',from:0,to:1,at:1.45,duration:.5}]}),
    T('You are on the clock.',30,637,21,380,C.muted,400,{align:'center'}),
    R(94,696,250,5,'#DAE3D3',3)
  ];
  scene('04 / Check in',13.2,5.2,[...copy('TIME','Every hour\naccounted for.','A quick scan. A clear record.\nFrom arrival to clock-out.',true),wrap('Clock-in phone',1100,150,438,760,phone,{motion:{enter:{from:{x:100,y:45,rotation:6,opacity:0},at:.1,duration:1,easing:ease}}}),wrap('Time recorded',1450,698,330,110,[R(0,0,330,110,C.mint,20),I('clock-3',22,34,38),T('08:00',85,22,43,220,C.green,600),T('Clock-in time',88,73,15,200,C.muted)],{motion:enter(90,25,1.4,.8)})],C.green);
  scene('05 / Clear pay',18,5.8,[...copy('PAY','Clear hours.\nClear pay.','Review recorded time and\nestimated earnings together.'),wrap('Pay review',950,180,830,688,[
    R(0,0,830,688,C.white,28,{strokeColor:C.line,strokeWidth:1,shadow:{y:18,blur:40,color:'#15362118'}}),T('Time & pay',35,29,31,650,C.ink,600),
    ...avatar('AM',37,105,C.mint,74),T('Alex Morgan',130,108,28,540,C.ink,600),T('Stage crew',130,150,21,550,C.muted),
    R(35,231,760,228,C.mint,23),T('ESTIMATED EARNINGS',61,253,18,600,C.muted,600,{letterSpacing:1}),
    wrap('Earnings',61,295,650,108,[wrap('Amount',0,0,650,108,[T('EUR 0.00',0,0,83,650,C.green,600,{height:108})])],{motion:{timeline:{duration:1.2,at:.65,easing:'ease-out',targets:[{target:'Amount',counter:{from:0,to:120,decimals:2,prefix:'EUR '}}]}},name:'Counter container'}),
    ...[['Recorded hours','8h 00m'],['Hourly rate','EUR 15.00']].map(([label,value],i)=>wrap(label,35+i*390,489,370,95,[T(label,0,0,21,360,C.muted),T(value,0,40,37,365,C.ink,600)],{motion:enter(0,25,.5+i*.08,.65)})),
    R(35,610,760,1,C.line,0),I('check',36,635,22),T('Ready for manager review',73,634,20,650,C.green)
  ].map(node=>node),{motion:enter(130,25,.2,.8)})]);
  scene('06 / Together',23.4,3.35,[
    T('ONE TEAM. ONE TEMPO.',230,160,22,1460,C.muted,600,{align:'center',letterSpacing:3}),
    T('Everything moves together.',160,238,99,1600,C.ink,600,{align:'center',motion:{by:'word',from:{y:45,opacity:0},duration:.7,overlap:.7,easing:'house'}}),
    ...[['calendar-days','Shifts','Plan with clarity.'],['users-round','People','Know what is next.'],['clock-3','Time & pay','Every hour counts.']].map(([name,title,body],i)=>wrap(title,215+i*505,478,480,330,[
      R(0,0,480,330,i===1?C.green:C.white,27,{strokeColor:C.line,strokeWidth:i===1?0:1}),I(name,35,38,49,i===1?C.mint:C.green),T(title,35,132,45,420,i===1?C.paper:C.ink,600),T(body,35,208,25,420,i===1?'#BCCEB7':C.muted)
    ],{motion:enter(0,70,.3+i*.1,.85)}))
  ]);
  scene('07 / Brand resolve',26.4,3.6,[
    logo(525,250,2.1,C.paper,true),
    T('Every shift, in sync.',240,541,62,1440,'#BDCEB5',400,{align:'center',motion:{by:'word',from:{y:30,opacity:0},at:.45,duration:.6,overlap:.7,easing:'house'}}),
    wrap('Start your workspace',695,705,530,84,[R(0,0,530,84,C.mint,18),T('Start your workspace',32,23,31,420,C.green,600),I('arrow-right',459,26,31)],{motion:enter(0,30,.9,.65)}),
    T('PEOPLE. TIME. IN SYNC.',260,950,19,1400,'#94AF91',600,{align:'center',letterSpacing:4})
  ],C.green);
  const sound = await p.add('/home/user/tempo-ad/soundtrack.wav');
  p.cut(sound,{at:0,from:0,dur:30});
  for (const t of [1.8,6.1,10.6,15.7,20.8,24.8,28.7]) await p.frame(t,'renders/frame-'+String(t).replace('.','-')+'.png');
};
