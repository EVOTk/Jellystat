exports.up = async function (knex) {
  try {
    await knex.schema.raw(`
DROP FUNCTION IF EXISTS public.fs_user_stats(integer, text);

CREATE OR REPLACE FUNCTION public.fs_user_stats(
	hours integer,
	userid text)
    RETURNS TABLE("Plays" bigint, total_playback_duration numeric, "UserId" text, "Name" text) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
      BEGIN
          RETURN QUERY
          SELECT
              count(a.*) AS "Plays",
              COALESCE(sum(a."PlaybackDuration"),0) AS total_playback_duration,
              u."Id",
              u."Name"
          FROM 
		  jf_users u
		  left join jf_playback_activity a
		  on a."UserId"=u."Id"
		  AND a."ActivityDateInserted" >  NOW() - INTERVAL '1 hour' * hours 
          WHERE
		  u."Id" = userid	  
          GROUP BY u."Id", u."Name"
          ORDER BY count(a.*) DESC;
      END;
      
$BODY$;

ALTER FUNCTION public.fs_user_stats(integer, text)
     OWNER TO "${process.env.POSTGRES_ROLE}";
    `);
  } catch (error) {
    console.error(error);
  }
};

exports.down = async function (knex) {
  try {
    await knex.schema.raw(`
    DROP FUNCTION IF EXISTS public.fs_user_stats(integer, text);

CREATE OR REPLACE FUNCTION public.fs_user_stats(
	hours integer,
	userid text)
    RETURNS TABLE("Plays" bigint, total_playback_duration numeric, "UserId" text, "Name" text) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
      BEGIN
          RETURN QUERY
          SELECT
              count(*) AS "Plays",
              sum(jf_playback_activity."PlaybackDuration") AS total_playback_duration,
              jf_playback_activity."UserId",
              jf_playback_activity."UserName" AS "Name"
          FROM jf_playback_activity
          WHERE
              jf_playback_activity."ActivityDateInserted" >  NOW() - INTERVAL '1 hour' * hours 
              AND jf_playback_activity."UserId" = userid
          GROUP BY jf_playback_activity."UserId", jf_playback_activity."UserName"
          ORDER BY count(*) DESC;
      END;
      
$BODY$;
  
      ALTER FUNCTION public.fs_user_stats(integer, text)
        OWNER TO "${process.env.POSTGRES_ROLE}";`);
  } catch (error) {
    console.error(error);
  }
};